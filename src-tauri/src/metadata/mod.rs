//! RAWG metadata boundary.
//!
//! The API key stays in the Rust process and is never returned to the webview.

use reqwest::{Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{env, time::Duration};

const RAWG_API_BASE: &str = "https://api.rawg.io/api";
const RAWG_PS2_PLATFORM_ID: &str = "15";
const MAX_QUERY_LENGTH: usize = 120;
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Deserialize)]
struct RawgSearchResponse {
    results: Vec<RawgSearchGame>,
}

#[derive(Debug, Deserialize)]
struct RawgSearchGame {
    id: u64,
    name: String,
    platforms: Option<Vec<RawgPlatformEntry>>,
}

#[derive(Debug, Deserialize)]
struct RawgPlatformEntry {
    platform: RawgNamedValue,
}

#[derive(Debug, Deserialize)]
struct RawgNamedValue {
    name: String,
}

#[derive(Debug, Deserialize)]
struct RawgGameDetails {
    id: u64,
    slug: String,
    name: String,
    description_raw: Option<String>,
    description: Option<String>,
    released: Option<String>,
    background_image: Option<String>,
    rating: Option<f64>,
    metacritic: Option<u16>,
    genres: Option<Vec<RawgNamedValue>>,
    developers: Option<Vec<RawgNamedValue>>,
    publishers: Option<Vec<RawgNamedValue>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameMetadata {
    rawg_id: u64,
    title: String,
    description: Option<String>,
    released_at: Option<String>,
    cover_url: Option<String>,
    genres: Vec<String>,
    developers: Vec<String>,
    publishers: Vec<String>,
    rating: Option<f64>,
    metacritic: Option<u16>,
    rawg_url: String,
}

#[tauri::command]
pub fn is_rawg_configured() -> bool {
    load_api_key().is_ok()
}

#[tauri::command]
pub async fn fetch_game_metadata(title: String, platform: String) -> Result<Option<GameMetadata>, String> {
    if platform.trim().to_uppercase() != "PS2" {
        return Err("Metadados RAWG estão disponíveis apenas para PS2 nesta versão.".into());
    }

    let query = sanitize_query(&title)?;
    let api_key = load_api_key()?;
    let client = Client::builder()
        .https_only(true)
        .timeout(Duration::from_secs(12))
        .user_agent("Ludex/0.5.3")
        .build()
        .map_err(|_| "Não foi possível preparar a conexão com a RAWG.".to_string())?;

    let search_url = format!("{RAWG_API_BASE}/games");
    let search: RawgSearchResponse = get_json(
        client
            .get(search_url)
            .query(&[
                ("key", api_key.as_str()),
                ("search", query.as_str()),
                ("search_precise", "true"),
                ("platforms", RAWG_PS2_PLATFORM_ID),
                ("page_size", "5"),
            ]),
    )
    .await?;

    let Some(candidate) = search.results.into_iter().find(is_ps2_game) else {
        return Ok(None);
    };

    if candidate.name.trim().is_empty() {
        return Ok(None);
    }

    let details_url = format!("{RAWG_API_BASE}/games/{}", candidate.id);
    let details: RawgGameDetails = get_json(
        client
            .get(details_url)
            .query(&[("key", api_key.as_str())]),
    )
    .await?;

    Ok(Some(map_metadata(details)))
}

fn load_api_key() -> Result<String, String> {
    dotenvy::dotenv().ok();
    let api_key = env::var("RAWG_API_KEY")
        .map_err(|_| "RAWG_API_KEY não configurada. Adicione a chave ao arquivo .env.".to_string())?;
    let api_key = api_key.trim();

    if api_key.len() < 16 || api_key.len() > 160 || api_key.chars().any(char::is_control) {
        return Err("RAWG_API_KEY possui formato inválido.".into());
    }

    Ok(api_key.to_string())
}

fn sanitize_query(title: &str) -> Result<String, String> {
    if title.chars().any(char::is_control) {
        return Err("O título do jogo não é válido para pesquisa de metadados.".into());
    }
    let query = title.split_whitespace().collect::<Vec<_>>().join(" ");
    if query.is_empty() || query.len() > MAX_QUERY_LENGTH {
        return Err("O título do jogo não é válido para pesquisa de metadados.".into());
    }
    Ok(query)
}

fn is_ps2_game(game: &RawgSearchGame) -> bool {
    game.platforms.as_ref().is_some_and(|platforms| {
        platforms.iter().any(|entry| {
            entry.platform.name.eq_ignore_ascii_case("PlayStation 2")
        })
    })
}

async fn get_json<T: DeserializeOwned>(request: reqwest::RequestBuilder) -> Result<T, String> {
    let response = request
        .send()
        .await
        .map_err(|_| "Não foi possível conectar à RAWG.".to_string())?;
    let status = response.status();

    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Err("A RAWG recusou a chave configurada.".into());
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err("Limite de requisições da RAWG atingido. Tente novamente mais tarde.".into());
    }
    if !status.is_success() {
        return Err(format!("A RAWG retornou uma resposta inesperada ({status})."));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|_| "Não foi possível ler a resposta da RAWG.".to_string())?;
    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("A resposta da RAWG excedeu o limite de segurança.".into());
    }

    serde_json::from_slice(&bytes).map_err(|_| "A RAWG retornou dados inválidos.".to_string())
}

fn map_metadata(details: RawgGameDetails) -> GameMetadata {
    let description = details
        .description_raw
        .filter(|value| !value.trim().is_empty())
        .or_else(|| details.description.map(strip_html))
        .map(|value| truncate(value.trim(), 4_000));

    GameMetadata {
        rawg_id: details.id,
        title: truncate(details.name.trim(), 200),
        description,
        released_at: details.released.filter(|value| value.len() == 10),
        cover_url: details.background_image.and_then(validate_image_url),
        genres: names(details.genres, 6),
        developers: names(details.developers, 6),
        publishers: names(details.publishers, 6),
        rating: details.rating.filter(|value| (0.0..=5.0).contains(value)),
        metacritic: details.metacritic.filter(|value| *value <= 100),
        rawg_url: format!("https://rawg.io/games/{}", safe_slug(&details.slug)),
    }
}

fn names(values: Option<Vec<RawgNamedValue>>, limit: usize) -> Vec<String> {
    values
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| {
            let name = value.name.trim();
            (!name.is_empty()).then(|| truncate(name, 100))
        })
        .take(limit)
        .collect()
}

fn validate_image_url(value: String) -> Option<String> {
    let url = reqwest::Url::parse(&value).ok()?;
    let host = url.host_str()?;
    (url.scheme() == "https"
        && (host == "rawg.io" || host.ends_with(".rawg.io"))
        && value.len() <= 2_000)
        .then_some(value)
}

fn safe_slug(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .take(160)
        .collect()
}

fn strip_html(value: String) -> String {
    let mut output = String::with_capacity(value.len());
    let mut inside_tag = false;
    for character in value.chars() {
        match character {
            '<' => inside_tag = true,
            '>' => inside_tag = false,
            _ if !inside_tag => output.push(character),
            _ => {}
        }
    }
    output
}

fn truncate(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_and_control_character_queries() {
        assert!(sanitize_query("   ").is_err());
        assert!(sanitize_query("valid\nquery").is_err());
    }

    #[test]
    fn only_accepts_https_rawg_images() {
        assert!(validate_image_url("https://media.rawg.io/media/game.jpg".into()).is_some());
        assert!(validate_image_url("http://media.rawg.io/media/game.jpg".into()).is_none());
        assert!(validate_image_url("https://example.com/game.jpg".into()).is_none());
    }

    #[test]
    fn sanitizes_slugs_and_html_fallbacks() {
        assert_eq!(safe_slug("god-of-war?<script>"), "god-of-warscript");
        assert_eq!(strip_html("<p>Safe <strong>text</strong></p>".into()), "Safe text");
    }
}
