use std::path::{Path, PathBuf};

const EXECUTABLE_NAMES: [&str; 2] = ["pcsx2-qt.exe", "pcsx2.exe"];

pub fn resolve_pcsx2_executable(path: &Path) -> Result<PathBuf, String> {
    if path.is_file() {
        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default();

        if EXECUTABLE_NAMES
            .iter()
            .any(|expected| file_name.eq_ignore_ascii_case(expected))
        {
            return path
                .canonicalize()
                .map_err(|error| format!("Não foi possível resolver o executável: {error}"));
        }

        return Err("Selecione pcsx2-qt.exe ou pcsx2.exe.".to_owned());
    }

    if path.is_dir() {
        for executable_name in EXECUTABLE_NAMES {
            let candidate = path.join(executable_name);
            if candidate.is_file() {
                return candidate
                    .canonicalize()
                    .map_err(|error| format!("Não foi possível resolver o executável: {error}"));
            }
        }

        return Err("A pasta não contém pcsx2-qt.exe ou pcsx2.exe.".to_owned());
    }

    Err("O caminho informado não existe.".to_owned())
}

pub fn discover_pcsx2_executable() -> Option<PathBuf> {
    discovery_candidates()
        .into_iter()
        .find_map(|candidate| resolve_pcsx2_executable(&candidate).ok())
}

pub fn path_to_string(path: &Path) -> String {
    let value = path.to_string_lossy();

    if let Some(network_path) = value.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{network_path}");
    }

    value.strip_prefix(r"\\?\").unwrap_or(&value).to_owned()
}

fn discovery_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    for environment_variable in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
        if let Some(root) = std::env::var_os(environment_variable) {
            candidates.push(PathBuf::from(root).join("PCSX2"));
        }
    }

    if cfg!(windows) {
        for drive_letter in b'C'..=b'Z' {
            candidates.push(PathBuf::from(format!("{}:\\PCSX2", drive_letter as char)));
        }
    }

    candidates
}

#[cfg(test)]
mod tests {
    use std::{fs, process};

    use super::*;

    #[test]
    fn resolves_an_executable_from_a_directory() {
        let directory = std::env::temp_dir().join(format!("ludex-pcsx2-{}", process::id()));
        fs::create_dir_all(&directory).expect("temporary directory");
        let executable = directory.join("pcsx2-qt.exe");
        fs::write(&executable, []).expect("mock executable");

        let resolved = resolve_pcsx2_executable(&directory).expect("resolved executable");
        assert_eq!(
            resolved,
            executable.canonicalize().expect("canonical executable")
        );

        fs::remove_dir_all(directory).expect("remove temporary directory");
    }

    #[test]
    fn rejects_an_unrelated_executable() {
        let result = resolve_pcsx2_executable(Path::new("updater.exe"));
        assert!(result.is_err());
    }

    #[test]
    fn removes_the_windows_verbatim_path_prefix() {
        assert_eq!(
            path_to_string(Path::new(r"\\?\F:\PCSX2\pcsx2-qt.exe")),
            r"F:\PCSX2\pcsx2-qt.exe"
        );
        assert_eq!(
            path_to_string(Path::new(r"\\?\UNC\server\share\pcsx2-qt.exe")),
            r"\\server\share\pcsx2-qt.exe"
        );
    }
}
