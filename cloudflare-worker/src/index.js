const INSTALL_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail
APP=lapetus

MUTED='\\033[0;2m'
RED='\\033[0;31m'
ORANGE='\\033[38;5;214m'
CYAN='\\033[0;96m'
NC='\\033[0m'

usage() {
    cat <<EOF
Lapetus Installer

Usage: install.sh [options]

Options:
    -h, --help              Display this help message
    -v, --version <version> Install a specific version (e.g., 1.0.180)
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, etc.)

Examples:
    curl -fsSL https://lapetus.ai/install | bash
    curl -fsSL https://lapetus.ai/install | bash -s -- --version 1.0.180
EOF
}

requested_version=\${VERSION:-}
no_modify_path=false

while [[ \$# -gt 0 ]]; do
    case "\$1" in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--version)
            if [[ -n "\${2:-}" ]]; then
                requested_version="\$2"
                shift 2
            else
                echo -e "\${RED}Error: --version requires a version argument\${NC}"
                exit 1
            fi
            ;;
        --no-modify-path)
            no_modify_path=true
            shift
            ;;
        *)
            echo -e "\${ORANGE}Warning: Unknown option '\$1'\${NC}" >&2
            shift
            ;;
    esac
done

raw_os=\$(uname -s)
os=\$(echo "\$raw_os" | tr '[:upper:]' '[:lower:]')
case "\$raw_os" in
  Darwin*) os="darwin" ;;
  Linux*) os="linux" ;;
  MINGW*|MSYS*|CYGWIN*) os="windows" ;;
esac

arch=\$(uname -m)
if [[ "\$arch" == "aarch64" ]]; then
  arch="arm64"
fi
if [[ "\$arch" == "x86_64" ]]; then
  arch="x64"
fi

if [ "\$os" = "darwin" ] && [ "\$arch" = "x64" ]; then
  rosetta_flag=\$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
  if [ "\$rosetta_flag" = "1" ]; then
    arch="arm64"
  fi
fi

combo="\$os-\$arch"
case "\$combo" in
  linux-x64|linux-arm64|darwin-x64|darwin-arm64|windows-x64)
    ;;
  *)
    echo -e "\${RED}Unsupported OS/Arch: \$os/\$arch\${NC}"
    exit 1
    ;;
esac

archive_ext=".zip"
if [ "\$os" = "linux" ]; then
  archive_ext=".tar.gz"
fi

is_musl=false
if [ "\$os" = "linux" ]; then
  if [ -f /etc/alpine-release ]; then
    is_musl=true
  fi
  if command -v ldd >/dev/null 2>&1; then
    if ldd --version 2>&1 | grep -qi musl; then
      is_musl=true
    fi
  fi
fi

needs_baseline=false
if [ "\$arch" = "x64" ]; then
  if [ "\$os" = "linux" ]; then
    if ! grep -qi avx2 /proc/cpuinfo 2>/dev/null; then
      needs_baseline=true
    fi
  fi
  if [ "\$os" = "darwin" ]; then
    avx2=\$(sysctl -n hw.optional.avx2_0 2>/dev/null || echo 0)
    if [ "\$avx2" != "1" ]; then
      needs_baseline=true
    fi
  fi
fi

target="\$os-\$arch"
if [ "\$needs_baseline" = "true" ]; then
  target="\$target-baseline"
fi
if [ "\$is_musl" = "true" ]; then
  target="\$target-musl"
fi

filename="\$APP-\$target\$archive_ext"

if [ "\$os" = "linux" ]; then
    if ! command -v tar >/dev/null 2>&1; then
         echo -e "\${RED}Error: 'tar' is required but not installed.\${NC}"
         exit 1
    fi
else
    if ! command -v unzip >/dev/null 2>&1; then
        echo -e "\${RED}Error: 'unzip' is required but not installed.\${NC}"
        exit 1
    fi
fi

INSTALL_DIR=\$HOME/.lapetus/bin
mkdir -p "\$INSTALL_DIR"

# Clean up old installations from other locations
echo -e "\${MUTED}Cleaning up old installations...\${NC}"
rm -f "\$HOME/.bun/bin/lapetus" 2>/dev/null || true
rm -f "\$HOME/.bun/bin/opencode" 2>/dev/null || true
rm -f "\$HOME/.local/bin/lapetus" 2>/dev/null || true
rm -f "\$HOME/.local/bin/opencode" 2>/dev/null || true
rm -f "\$HOME/.opencode/bin/opencode" 2>/dev/null || true
rm -rf "\$HOME/.opencode/bin" 2>/dev/null || true

# Remove old lapetus binary before installing new one
rm -f "\$INSTALL_DIR/lapetus" 2>/dev/null || true

GITHUB_REPO="dhhd67807-lgtm/lapetus-1"

if [ -z "\$requested_version" ] || [ "\$requested_version" = "latest" ]; then
    url="https://github.com/\$GITHUB_REPO/releases/download/latest/\$filename"
    specific_version="latest"
else
    # Try versioned release first, fall back to latest
    url="https://github.com/\$GITHUB_REPO/releases/download/v\${requested_version}/\$filename"
    specific_version=\$requested_version
fi

echo -e "\\n\${MUTED}Installing \${NC}lapetus \${MUTED}version: \${NC}\$specific_version"

tmp_dir="\${TMPDIR:-/tmp}/lapetus_install_\$\$"
mkdir -p "\$tmp_dir"

curl -# -L -o "\$tmp_dir/\$filename" "\$url"

if [ "\$os" = "linux" ]; then
    tar -xzf "\$tmp_dir/\$filename" -C "\$tmp_dir"
else
    unzip -q "\$tmp_dir/\$filename" -d "\$tmp_dir"
fi

mv "\$tmp_dir/lapetus" "\$INSTALL_DIR"
chmod 755 "\${INSTALL_DIR}/lapetus"
rm -rf "\$tmp_dir"

add_to_path() {
    local config_file=\$1
    local command=\$2
    if grep -Fxq "\$command" "\$config_file"; then
        echo "Command already exists in \$config_file, skipping."
    elif [[ -w \$config_file ]]; then
        echo -e "\\n# lapetus" >> "\$config_file"
        echo "\$command" >> "\$config_file"
        echo -e "\${MUTED}Added lapetus to PATH in \${NC}\$config_file"
    fi
}

current_shell=\$(basename "\$SHELL")
case \$current_shell in
    fish) config_file="\$HOME/.config/fish/config.fish" ;;
    zsh) config_file="\$HOME/.zshrc" ;;
    bash) config_file="\$HOME/.bashrc" ;;
    *) config_file="\$HOME/.bashrc" ;;
esac

if [[ "\$no_modify_path" != "true" ]] && [[ -f \$config_file ]] && [[ ":\$PATH:" != *":\$INSTALL_DIR:"* ]]; then
    case \$current_shell in
        fish) add_to_path "\$config_file" "fish_add_path \$INSTALL_DIR" ;;
        *) add_to_path "\$config_file" "export PATH=\$INSTALL_DIR:\\\$PATH" ;;
    esac
fi

echo -e ""
echo -e "\${CYAN}██       █████  ██████  ███████ ████████ ██    ██ ███████\${NC}"
echo -e "\${CYAN}██      ██   ██ ██   ██ ██         ██    ██    ██ ██     \${NC}"
echo -e "\${CYAN}██      ███████ ██████  █████      ██    ██    ██ ███████\${NC}"
echo -e "\${CYAN}██      ██   ██ ██      ██         ██    ██    ██      ██\${NC}"
echo -e "\${CYAN}███████ ██   ██ ██      ███████    ██     ██████  ███████\${NC}"
echo -e ""
echo -e "\${MUTED}To start:\${NC}"
echo -e ""
echo -e "cd <project>  \${MUTED}# Open directory\${NC}"
echo -e "lapetus       \${MUTED}# Run command\${NC}"
echo -e ""
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/install' || url.pathname === '/install.sh') {
      return new Response(INSTALL_SCRIPT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
    
    return new Response('Lapetus - AI-powered development tool\n\nInstall: curl -fsSL ' + url.origin + '/install | bash', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
