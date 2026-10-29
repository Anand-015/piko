$registryUrl = "https://kokonutui.com/r/registry.json"

$registry = Invoke-RestMethod -Uri $registryUrl

# Get all registered component names
$names = @($registry.items | ForEach-Object { $_.name })

Write-Host "Found $($names.Count) registry items."

# Install each component and its dependencies
foreach ($name in $names) {
    Write-Host "`nInstalling: $name" -ForegroundColor Cyan

    npx shadcn@latest add "@kokonutui/$name" --yes

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Installation failed for $name"
    }
}

Write-Host "`nBulk installation finished."
