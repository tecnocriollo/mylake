#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/install-k8s-tools.sh [--with-k3s]

Installs the local tools needed to deploy and verify MyLake:
  - helm
  - kubectl

Options:
  --with-k3s    Also install a single-node local k3s cluster and configure
                KUBECONFIG for the current shell instructions.
  -h, --help    Show this help.

After the script finishes, run:
  cd /home/pato/projects/mylake/.worktrees/infra-foundation
  helm lint deploy/helm/mylake-base
  helm upgrade --install mylake-base ./deploy/helm/mylake-base --create-namespace
  kubectl exec -n mylake -it statefulset/postgres -- psql -U admin -d mylake -c "\dn"
  kubectl get pods -n mylake -l app=rustfs
USAGE
}

log() {
  printf '\n==> %s\n' "$1"
}

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_linux() {
  [[ "$(uname -s)" == "Linux" ]] || die "This installer currently supports Linux only."
}

require_ubuntu_or_debian() {
  [[ -r /etc/os-release ]] || die "Cannot read /etc/os-release."
  # shellcheck disable=SC1091
  . /etc/os-release

  case "${ID:-}" in
    ubuntu|debian)
      ;;
    *)
      case "${ID_LIKE:-}" in
        *debian*)
          ;;
        *)
          die "This installer expects Ubuntu or Debian. Detected ID=${ID:-unknown}."
          ;;
      esac
      ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)
      printf 'amd64'
      ;;
    aarch64|arm64)
      printf 'arm64'
      ;;
    *)
      die "Unsupported CPU architecture: $(uname -m)"
      ;;
  esac
}

install_base_packages() {
  log "Installing base packages"
  sudo apt-get update
  sudo apt-get install -y apt-transport-https ca-certificates curl gpg
}

install_helm() {
  if command -v helm >/dev/null 2>&1; then
    log "Helm already installed: $(helm version --short 2>/dev/null || helm version)"
    return
  fi

  log "Installing Helm"
  curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey \
    | gpg --dearmor \
    | sudo tee /usr/share/keyrings/helm.gpg >/dev/null

  echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" \
    | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y helm
}

install_kubectl() {
  if command -v kubectl >/dev/null 2>&1; then
    log "kubectl already installed: $(kubectl version --client=true 2>/dev/null | head -n 1)"
    return
  fi

  local arch
  local version
  local temp_dir

  arch="$(detect_arch)"
  version="$(curl -L -s https://dl.k8s.io/release/stable.txt)"
  temp_dir="$(mktemp -d)"

  log "Installing kubectl ${version} for linux/${arch}"
  (
    cd "$temp_dir"
    curl -LO "https://dl.k8s.io/release/${version}/bin/linux/${arch}/kubectl"
    curl -LO "https://dl.k8s.io/release/${version}/bin/linux/${arch}/kubectl.sha256"
    echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  )

  rm -rf "$temp_dir"
}

install_k3s() {
  if command -v k3s >/dev/null 2>&1; then
    log "k3s already installed: $(k3s --version | head -n 1)"
  else
    log "Installing single-node k3s"
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --write-kubeconfig-mode=644" sh -
  fi

  if [[ -r /etc/rancher/k3s/k3s.yaml ]]; then
    log "k3s kubeconfig is available at /etc/rancher/k3s/k3s.yaml"
  else
    die "k3s installed, but /etc/rancher/k3s/k3s.yaml is not readable."
  fi
}

verify_tools() {
  log "Verifying installed tools"
  helm version --short
  kubectl version --client=true

  if [[ -n "${KUBECONFIG:-}" ]]; then
    log "KUBECONFIG is set to ${KUBECONFIG}"
  elif [[ -r "$HOME/.kube/config" ]]; then
    log "Found kubeconfig at $HOME/.kube/config"
  elif [[ -r /etc/rancher/k3s/k3s.yaml ]]; then
    log "Found k3s kubeconfig at /etc/rancher/k3s/k3s.yaml"
    printf 'Run this before using helm or kubectl with k3s:\n'
    printf '  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml\n'
  else
    printf '\nNo kubeconfig found yet. Provide one at ~/.kube/config, set KUBECONFIG, or rerun with --with-k3s.\n'
  fi
}

main() {
  local with_k3s=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --with-k3s)
        with_k3s=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "Unknown argument: $1"
        ;;
    esac
  done

  require_linux
  require_ubuntu_or_debian
  need_command sudo
  need_command curl

  install_base_packages
  install_helm
  install_kubectl

  if [[ "$with_k3s" == true ]]; then
    install_k3s
  fi

  verify_tools

  log "Tool installation finished"
}

main "$@"
