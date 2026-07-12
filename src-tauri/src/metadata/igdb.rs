use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::{
    env,
    time::{Duration, Instant},
};
use tauri::State;
use tokio::sync::Mutex;

const TWITCH_TOKEN_URL: &str = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL: &str = "https://api.igdb.com/v4/games";
const PS2_PLATFORM_ID: u16 = 8;
const MIN_CONFIDENCE: f64 = 0.72;
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

pub struct IgdbState {
    token: Mutex<Option<CachedToken>>,
    client: Client,
}

impl Default for IgdbState {
    fn default() -> Self {
        Self {
            token: Mutex::new(None),
            client: Client::builder()
                .https_only(true)
                .timeout(Duration::from_secs(12))
                .user_agent("Arcadium/0.6.0")
                .build()
                .expect("valid IGDB HTTP client"),
        }
    }
}

struct CachedToken {
    value: String,
    expires_at: Instant,
}

#[derive(Deserialize)]
struct TwitchToken {
    access_token: String,
    expires_in: u64,
}

#[derive(Debug, Deserialize)]
struct IgdbGame {
    id: u64,
    name: String,
    summary: Option<String>,
    first_release_date: Option<i64>,
    cover: Option<IgdbImage>,
    artworks: Option<Vec<IgdbImage>>,
    genres: Option<Vec<IgdbNamed>>,
    involved_companies: Option<Vec<IgdbCompanyRole>>,
    videos: Option<Vec<IgdbVideo>>,
    rating: Option<f64>,
    aggregated_rating: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct IgdbImage {
    image_id: String,
    width: Option<u32>,
    height: Option<u32>,
}
#[derive(Debug, Deserialize)]
struct IgdbNamed {
    name: String,
}
#[derive(Debug, Deserialize)]
struct IgdbCompanyRole {
    company: IgdbNamed,
    developer: Option<bool>,
    publisher: Option<bool>,
}
#[derive(Debug, Deserialize)]
struct IgdbVideo {
    name: Option<String>,
    video_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IgdbMetadata {
    igdb_id: u64,
    title: String,
    summary: Option<String>,
    release_timestamp: Option<i64>,
    genres: Vec<String>,
    developers: Vec<String>,
    publishers: Vec<String>,
    cover: Option<IgdbArtwork>,
    artworks: Vec<IgdbArtwork>,
    videos: Vec<IgdbVideoReference>,
    confidence: f64,
    rating: Option<f64>,
    metacritic: Option<u16>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IgdbArtwork {
    image_id: String,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IgdbVideoReference {
    external_id: String,
    title: Option<String>,
}

#[tauri::command]
pub fn is_igdb_configured() -> bool {
    credentials().is_ok()
}

#[tauri::command]
pub async fn fetch_igdb_metadata(
    state: State<'_, IgdbState>,
    title: String,
    platform: String,
    release_year: Option<u16>,
) -> Result<Option<IgdbMetadata>, String> {
    if platform.trim().to_uppercase() != "PS2" {
        return Err("IGDB disponível apenas para PS2 nesta versão.".into());
    }
    let normalized = normalize_title(&title)?;
    let (client_id, client_secret) = credentials()?;
    let mut token = access_token(&state, &client_id, &client_secret).await?;
    let query = build_query(&normalized);
    let mut response = request_games(&state.client, &client_id, &token, &query).await?;
    if response.status() == StatusCode::UNAUTHORIZED {
        *state.token.lock().await = None;
        token = access_token(&state, &client_id, &client_secret).await?;
        response = request_games(&state.client, &client_id, &token, &query).await?;
    }
    match response.status() {
        StatusCode::FORBIDDEN => return Err("A IGDB recusou as credenciais configuradas.".into()),
        StatusCode::TOO_MANY_REQUESTS => {
            return Err("Limite de requisições da IGDB atingido.".into())
        }
        status if !status.is_success() => {
            return Err(format!(
                "A IGDB retornou uma resposta inesperada ({status})."
            ))
        }
        _ => {}
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "Não foi possível ler a resposta da IGDB.".to_string())?;
    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("A resposta da IGDB excedeu o limite de segurança.".into());
    }
    let games: Vec<IgdbGame> = serde_json::from_slice(&bytes)
        .map_err(|_| "A IGDB retornou dados inválidos.".to_string())?;
    let best = games
        .into_iter()
        .map(|game| {
            let mut score = confidence(&normalized, &game.name);
            if let (Some(expected), Some(timestamp)) = (release_year, game.first_release_date) {
                let actual = 1970 + timestamp / 31_556_952;
                if (actual - i64::from(expected)).abs() <= 1 {
                    score = (score + 0.08).min(1.0);
                }
            }
            (game, score)
        })
        .max_by(|left, right| left.1.total_cmp(&right.1));
    let Some((game, score)) = best.filter(|(_, score)| *score >= MIN_CONFIDENCE) else {
        return Ok(None);
    };
    Ok(Some(map_game(game, score)))
}

async fn request_games(
    client: &Client,
    client_id: &str,
    token: &str,
    query: &str,
) -> Result<reqwest::Response, String> {
    client
        .post(IGDB_GAMES_URL)
        .header("Client-ID", client_id)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .body(query.to_string())
        .send()
        .await
        .map_err(|_| "Não foi possível conectar à IGDB.".to_string())
}

async fn access_token(state: &IgdbState, client_id: &str, secret: &str) -> Result<String, String> {
    if let Some(cached) = state.token.lock().await.as_ref() {
        if cached.expires_at > Instant::now() + Duration::from_secs(60) {
            return Ok(cached.value.clone());
        }
    }
    let response = state
        .client
        .post(TWITCH_TOKEN_URL)
        .form(&[
            ("client_id", client_id),
            ("client_secret", secret),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|_| "Não foi possível autenticar com a Twitch.".to_string())?;
    if response.status() == StatusCode::TOO_MANY_REQUESTS {
        return Err("Limite de autenticação da Twitch atingido.".into());
    }
    if !response.status().is_success() {
        return Err("A Twitch recusou as credenciais da IGDB.".into());
    }
    let payload: TwitchToken = response
        .json()
        .await
        .map_err(|_| "A Twitch retornou um token inválido.".to_string())?;
    if payload.access_token.len() < 16 || payload.expires_in < 60 {
        return Err("A Twitch retornou um token inválido.".into());
    }
    let value = payload.access_token;
    *state.token.lock().await = Some(CachedToken {
        value: value.clone(),
        expires_at: Instant::now() + Duration::from_secs(payload.expires_in),
    });
    Ok(value)
}

fn credentials() -> Result<(String, String), String> {
    dotenvy::dotenv().ok();
    let id = env::var("TWITCH_CLIENT_ID")
        .map_err(|_| "TWITCH_CLIENT_ID não configurado.".to_string())?;
    let secret = env::var("TWITCH_CLIENT_SECRET")
        .map_err(|_| "TWITCH_CLIENT_SECRET não configurado.".to_string())?;
    if !valid_secret(&id) || !valid_secret(&secret) {
        return Err("Credenciais Twitch possuem formato inválido.".into());
    }
    Ok((id.trim().into(), secret.trim().into()))
}

fn valid_secret(value: &str) -> bool {
    (16..=200).contains(&value.trim().len()) && !value.chars().any(char::is_control)
}
fn normalize_title(value: &str) -> Result<String, String> {
    if value.chars().any(char::is_control) {
        return Err("Título inválido para consulta IGDB.".into());
    }
    let value = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if value.is_empty() || value.len() > 120 {
        return Err("Título inválido para consulta IGDB.".into());
    }
    Ok(value)
}
fn build_query(title: &str) -> String {
    let escaped = title.replace('\\', "").replace('"', "");
    format!("search \"{escaped}\"; fields id,name,summary,first_release_date,rating,aggregated_rating,cover.image_id,cover.width,cover.height,artworks.image_id,artworks.width,artworks.height,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,videos.name,videos.video_id; where platforms = ({PS2_PLATFORM_ID}); limit 8;")
}
fn confidence(expected: &str, candidate: &str) -> f64 {
    let left = title_words(expected);
    let right = title_words(candidate);
    if left == right {
        return 1.0;
    }
    let intersection = left.iter().filter(|word| right.contains(word)).count();
    let union = left.len() + right.len() - intersection;
    intersection as f64 / union.max(1) as f64
}
fn title_words(value: &str) -> Vec<String> {
    value
        .to_lowercase()
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|v| !v.is_empty())
        .map(str::to_string)
        .collect()
}
fn map_game(game: IgdbGame, confidence: f64) -> IgdbMetadata {
    let roles = game.involved_companies.unwrap_or_default();
    IgdbMetadata {
        igdb_id: game.id,
        title: game.name,
        summary: game.summary,
        release_timestamp: game.first_release_date,
        genres: game
            .genres
            .unwrap_or_default()
            .into_iter()
            .map(|v| v.name)
            .take(8)
            .collect(),
        developers: roles
            .iter()
            .filter(|v| v.developer.unwrap_or(false))
            .map(|v| v.company.name.clone())
            .take(6)
            .collect(),
        publishers: roles
            .iter()
            .filter(|v| v.publisher.unwrap_or(false))
            .map(|v| v.company.name.clone())
            .take(6)
            .collect(),
        cover: game.cover.map(map_image),
        artworks: game
            .artworks
            .unwrap_or_default()
            .into_iter()
            .map(map_image)
            .take(8)
            .collect(),
        videos: game
            .videos
            .unwrap_or_default()
            .into_iter()
            .filter(|v| valid_video_id(&v.video_id))
            .map(|v| IgdbVideoReference {
                external_id: v.video_id,
                title: v.name,
            })
            .take(8)
            .collect(),
        rating: game
            .rating
            .filter(|value| (0.0..=100.0).contains(value))
            .map(|value| value / 20.0),
        metacritic: game
            .aggregated_rating
            .filter(|value| (0.0..=100.0).contains(value))
            .map(|value| value.round() as u16),
        confidence,
    }
}
fn map_image(image: IgdbImage) -> IgdbArtwork {
    IgdbArtwork {
        image_id: image.image_id,
        width: image.width,
        height: image.height,
    }
}
fn valid_video_id(value: &str) -> bool {
    (6..=32).contains(&value.len())
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn builds_ps2_query_without_injection() {
        let q = build_query("God of War II\"; limit 500;");
        assert!(q.contains("where platforms = (8)"));
        assert!(!q.contains("II\""));
    }
    #[test]
    fn rejects_ambiguous_match() {
        assert!(confidence("God of War II", "God Hand") < MIN_CONFIDENCE);
    }
    #[test]
    fn selects_black_instead_of_twisted_metal_black() {
        assert_eq!(confidence("Black", "Black"), 1.0);
        assert!(confidence("Black", "Twisted Metal: Black") < MIN_CONFIDENCE);
    }
    #[test]
    fn validates_youtube_ids() {
        assert!(valid_video_id("abc_DEF-123"));
        assert!(!valid_video_id("bad/id"));
    }
}
