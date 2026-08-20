param(
  [string]$Remote = "origin",
  [string]$Branch
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$keyPath = Join-Path $repoRoot ".codex\github-new-account\id_ed25519"

if (-not (Test-Path $keyPath)) {
  throw "SSH key not found at $keyPath. Run the key setup first."
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  $Branch = (& git -C $repoRoot branch --show-current).Trim()
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
  throw "Could not determine the current branch."
}

$remoteUrl = (& git -C $repoRoot remote get-url $Remote 2>$null).Trim()
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  throw "Remote '$Remote' does not exist. Add it first with: git remote add $Remote <repo-url>"
}

$env:GIT_SSH_COMMAND = "ssh -i `"$keyPath`" -o IdentitiesOnly=yes"
try {
  & git -C $repoRoot push $Remote $Branch
}
finally {
  Remove-Item Env:\GIT_SSH_COMMAND -ErrorAction SilentlyContinue
}
