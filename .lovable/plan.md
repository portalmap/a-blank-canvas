

# Melhorar qualidade do áudio + Transcrição automática

## Problema 1: Qualidade baixa do áudio

O `MediaRecorder` está sendo criado sem configurar bitrate nem codec específico. O navegador usa defaults baixos (~32kbps). 

**Correção em `src/components/audio/AudioRecorderButton.tsx`:**
- Usar codec Opus explícito: `audio/webm;codecs=opus`
- Definir `audioBitsPerSecond: 128000` (128kbps — qualidade alta)
- Adicionar constraints de áudio otimizados: `echoCancellation`, `noiseSuppression`, `autoGainControl`, `sampleRate: 48000`

## Problema 2: Transcrição do áudio

Adicionar botão "Transcrever" no `AudioPlayer` que envia o áudio para um modelo Gemini (via Lovable Cloud) e exibe o texto transcrito abaixo do player.

### 2a. Edge function `transcribe-audio`
- Recebe o áudio como FormData (file)
- Converte para base64
- Envia ao Gemini Flash via Lovable AI gateway com prompt "Transcreva este áudio em português"
- Retorna o texto transcrito

### 2b. Alteração no `AudioPlayer.tsx`
- Adicionar botão "Transcrever" (ícone `FileText`) ao lado do player
- Ao clicar, faz fetch do áudio da URL, envia para a edge function
- Exibe o texto transcrito abaixo do player (com estado loading)
- Cache local: se já transcreveu, não transcreve de novo

## Arquivos alterados

1. `src/components/audio/AudioRecorderButton.tsx` — qualidade do áudio
2. `src/components/audio/AudioPlayer.tsx` — botão de transcrição + exibição
3. `supabase/functions/transcribe-audio/index.ts` — nova edge function

## Fluxo da transcrição

```text
Usuário clica "Transcrever" no player
  → Fetch do arquivo de áudio da URL pública
  → POST para edge function /transcribe-audio
  → Edge function converte para base64 e envia ao Gemini
  → Retorna texto transcrito
  → Exibe abaixo do player
```

