# 📦 Como Publicar no GitHub Pages

## Passo 1: Configurar o Git (se ainda não configurou)
Execute no terminal dentro da pasta do projeto:

```bash
git config user.name "Seu Nome"
git config user.email "seu.email@example.com"
```

## Passo 2: Fazer o commit inicial
Os arquivos já estão prontos. Execute:

```bash
git commit -m "Commit inicial - Pregnancy Planner"
```

## Passo 3: Criar repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique em "New repository" (novo repositório)
3. Escolha um nome para o repositório (ex: `pregnancy-planner`)
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

## Passo 4: Conectar ao GitHub e fazer Push

No terminal, execute (substitua `SEU_USUARIO` e `NOME_DO_REPOSITORIO`):

```bash
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git branch -M main
git push -u origin main
```

## Passo 5: Habilitar GitHub Pages

1. No GitHub, vá até Settings (Configurações) do repositório
2. No menu lateral, clique em "Pages"
3. Em "Source", selecione "Deploy from a branch"
4. Escolha a branch "main" e a pasta "/ (root)"
5. Clique em "Save"
6. Aguarde alguns minutos e seu site estará disponível em:
   `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`

## ✅ Pronto!

Seu site estará hospedado gratuitamente no GitHub Pages! 🎉

**Nota**: Qualquer atualização que você fizer e fizer push para o GitHub, será automaticamente atualizada no site (pode levar alguns minutos para refletir).

