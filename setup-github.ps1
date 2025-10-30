# Script para configurar e publicar no GitHub
Write-Host "=== Configuração para GitHub Pages ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se já está configurado
$gitUser = git config user.name
$gitEmail = git config user.email

if (-not $gitUser -or -not $gitEmail) {
    Write-Host "Configurando Git..." -ForegroundColor Yellow
    $name = Read-Host "Digite seu nome"
    $email = Read-Host "Digite seu email do GitHub"
    
    git config user.name $name
    git config user.email $email
    Write-Host "✓ Git configurado!" -ForegroundColor Green
} else {
    Write-Host "✓ Git já configurado: $gitUser <$gitEmail>" -ForegroundColor Green
}

Write-Host ""
Write-Host "Fazendo commit inicial..." -ForegroundColor Yellow
git commit -m "Commit inicial - Pregnancy Planner"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit realizado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Crie um repositório no GitHub (github.com/new)"
    Write-Host "2. Execute os seguintes comandos (substitua SEU_USUARIO e NOME_DO_REPOSITORIO):"
    Write-Host ""
    Write-Host "   git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git" -ForegroundColor Yellow
    Write-Host "   git branch -M main" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Habilite GitHub Pages em Settings > Pages" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para mais detalhes, consulte o arquivo PUBLICAR.md" -ForegroundColor Gray
} else {
    Write-Host "Erro ao fazer commit. Verifique se há mudanças pendentes." -ForegroundColor Red
}

