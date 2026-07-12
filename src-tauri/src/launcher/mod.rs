//! Native emulator process launcher boundary.
//!
//! Launching is intentionally done without a shell. Paths are canonicalized,
//! game extensions are validated, and custom profile arguments are passed as
//! literal process arguments.

use serde::Serialize;
use std::{
    path::{Path, PathBuf},
    process::Command,
};

const PS2_EXTENSIONS: [&str; 4] = [".iso", ".chd", ".bin", ".cue"];
const PCSX2_FULLSCREEN_ARG: &str = "-fullscreen";
const PCSX2_EXECUTABLE_CANDIDATES: [&str; 3] = ["pcsx2-qt.exe", "pcsx2.exe", "pcsx2-avx2.exe"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchGameResult {
    emulator_path: String,
    game_path: String,
    process_id: u32,
}

#[tauri::command]
pub fn launch_game(
    emulator_path: String,
    game_path: String,
    platform: String,
    fullscreen: Option<bool>,
    args: Option<Vec<String>>,
) -> Result<LaunchGameResult, String> {
    let platform = platform.trim().to_uppercase();
    if platform != "PS2" {
        return Err("Launcher real disponível apenas para PS2 nesta versão.".into());
    }

    let emulator = resolve_pcsx2_executable(&emulator_path)?;
    let game = resolve_game_file(&game_path, &platform)?;
    let launch_args = validate_launch_args(args.unwrap_or_default())?;
    let mut command = Command::new(&emulator);

    if fullscreen.unwrap_or(false) {
        command.arg(PCSX2_FULLSCREEN_ARG);
    }

    let child = command
        .args(launch_args)
        .arg(&game)
        .spawn()
        .map_err(|error| format!("Não foi possível iniciar o PCSX2: {error}"))?;

    Ok(LaunchGameResult {
        emulator_path: emulator.to_string_lossy().to_string(),
        game_path: game.to_string_lossy().to_string(),
        process_id: child.id(),
    })
}

fn resolve_pcsx2_executable(path: &str) -> Result<PathBuf, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("Configure o caminho do PCSX2 antes de jogar.".into());
    }

    let configured_path = PathBuf::from(trimmed_path);
    let canonical_path = configured_path.canonicalize().map_err(|_| {
        "O caminho configurado do PCSX2 não existe ou não pode ser acessado.".to_string()
    })?;

    if canonical_path.is_file() {
        validate_windows_executable(&canonical_path)?;
        return Ok(canonical_path);
    }

    if canonical_path.is_dir() {
        for candidate in PCSX2_EXECUTABLE_CANDIDATES {
            let executable = canonical_path.join(candidate);
            if executable.is_file() {
                validate_windows_executable(&executable)?;
                return executable
                    .canonicalize()
                    .map_err(|_| "Não foi possível resolver o executável do PCSX2.".to_string());
            }
        }
    }

    Err("Informe a pasta do PCSX2 ou o arquivo pcsx2-qt.exe.".into())
}

fn resolve_game_file(path: &str, platform: &str) -> Result<PathBuf, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("Caminho do jogo inválido.".into());
    }

    let canonical_path = PathBuf::from(trimmed_path)
        .canonicalize()
        .map_err(|_| "O arquivo do jogo não existe ou não pode ser acessado.".to_string())?;

    if !canonical_path.is_file() {
        return Err("O jogo selecionado precisa ser um arquivo.".into());
    }

    let extension = normalized_extension(&canonical_path)
        .ok_or_else(|| "O arquivo do jogo não possui extensão válida.".to_string())?;

    if !is_supported_extension(platform, &extension) {
        return Err(format!(
            "Extensão não suportada para {platform}: {extension}"
        ));
    }

    Ok(canonical_path)
}

fn validate_launch_args(args: Vec<String>) -> Result<Vec<String>, String> {
    if args.len() > 16 {
        return Err("O perfil de execução possui argumentos demais.".into());
    }

    args.into_iter()
        .map(|arg| {
            let trimmed_arg = arg.trim();

            if trimmed_arg.is_empty() {
                return Err("Argumentos vazios não são permitidos.".into());
            }

            if trimmed_arg.len() > 160 {
                return Err("Um dos argumentos do perfil é longo demais.".into());
            }

            if trimmed_arg.chars().any(char::is_control) {
                return Err("Argumentos com caracteres de controle não são permitidos.".into());
            }

            Ok(trimmed_arg.to_string())
        })
        .collect()
}

fn validate_windows_executable(path: &Path) -> Result<(), String> {
    let extension = normalized_extension(path)
        .ok_or_else(|| "O executável do emulador precisa ser um arquivo .exe.".to_string())?;

    if extension != ".exe" {
        return Err("O executável do emulador precisa ser um arquivo .exe.".into());
    }

    Ok(())
}

fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .map(|extension| format!(".{}", extension.to_string_lossy().to_lowercase()))
}

fn is_supported_extension(platform: &str, extension: &str) -> bool {
    match platform {
        "PS2" => PS2_EXTENSIONS.contains(&extension),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_the_supported_pcsx2_fullscreen_argument() {
        assert_eq!(PCSX2_FULLSCREEN_ARG, "-fullscreen");
    }
}
