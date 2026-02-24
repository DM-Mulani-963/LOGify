# AI Security Alert System - Feature Documentation

## Overview

LOGify now includes an **AI-powered security alert system** using Google Gemini API to automatically detect:

- 🦠 Malware activity
- 🔓 Brute force attacks
- ⚔️ SQL injection / XSS attempts
- 🚨 Privilege escalation
- 📤 Data exfiltration
- 🔧 Suspicious command execution

## Features

### 1. Automatic Mandatory Alerts

When AI is configured, **every scan automatically analyzes logs** for security threats.

- ✅ Runs after `logify scan` completes
- ✅ Only sends suspicious logs to AI (minimal token usage)
- ✅ Pattern-based pre-filtering before expensive AI calls
- ✅ Clear severity levels: CRITICAL, HIGH, MEDIUM, LOW

### 2. Optional AI Questions

Ask AI about your logs using minimal tokens:

```bash
logify ask-ai "Are there any failed login attempts?"
logify ask-ai "What security issues should I investigate?"
```

## Setup

### 1. Get Gemini API Key

Visit: https://makersuite.google.com/app/apikey

### 2. Install Python Package

```bash
pip install google-generativeai
```

### 3. Configure LOGify

```bash
logify set-ai-api gemini YOUR_API_KEY_HERE
```

### 4. Verify Setup

```bash
logify ai-status
```

Output:

```
  AI Security Alert System Status
┏━━━━━━━━━━┳━━━━━━━━━━━━━━━━┓
┃ Setting  ┃ Value          ┃
┡━━━━━━━━━━╇━━━━━━━━━━━━━━━━┩
│ Status   │ ✅ Enabled     │
│ Provider │ Google Gemini  │
│ API Key  │ AIzaSy*******  │
└──────────┴────────────────┘
```

## Usage

### Automatic Analysis (Mandatory)

Just run scan as normal:

```bash
sudo logify scan --full
```

After collecting logs, AI analysis runs automatically:

```
============================================================
✓ Total Log Collection Summary:
  System + Security: 150
  Administrator:     45
  User Activity:     12
  TOTAL:             207
============================================================

🤖 Running AI Security Analysis...

🚨 SECURITY ALERTS DETECTED
============================================================

🚨 [CRITICAL] BRUTE_FORCE
   Multiple failed SSH login attempts from unknown IP
   💡 Recommendation: Block IP address and review auth logs
   📋 Affected: auth.log, syslog

⚠️ [HIGH] MALWARE
   Suspicious wget download to /tmp hidden directory
   💡 Recommendation: Investigate /tmp/.hidden/ for malware
   📋 Affected: bash_history, syslog

============================================================
```

### Ask AI Questions

```bash
# Quick security check
logify ask-ai "Is there evidence of malware?"

# Investigate specific issues
logify ask-ai "Why are there so many MySQL errors?"

# General analysis
logify ask-ai "What are the top 3 security concerns?"
```

## Token Usage Optimization

### Pre-filtering

Before sending logs to AI, LOGify filters for suspicious patterns:

- Failed authentication keywords
- Dangerous commands (rm -rf, chmod 777)
- Web attack indicators (SQL, XSS)
- Network scanning activity
- Malware signatures

**Result**: Only ~30-50 suspicious log entries sent to AI instead of thousands

### Minimal Context

- Truncates long messages to 100 characters
- Includes only essential fields (source, level, message)
- Maximum 30 logs per AI request

**Estimated cost**: ~$0.001 per scan (Gemini 1.5 Flash pricing)

## CLI Commands

### set-ai-api

```bash
logify set-ai-api gemini <API_KEY>
```

Configure AI provider and API key. Currently only Gemini supported.

### ai-status

```bash
logify ai-status
```

Display current AI configuration status.

### ask-ai

```bash
logify ask-ai "question about logs"
```

Ask AI a question about recent logs (max 50 logs for context).

## How It Works

### 1. Pattern-Based Pre-Filter

`ai_alerts.py::is_suspicious()` checks for:

- Keywords: "failed password", "sudo", "wget", "chmod 777"
- Web attacks: "sql", "union select", "<script", "../"
- Malware: "cryptominer", "ransomware", "base64"
- High severity: ERROR/CRITICAL with "fail", "attack", "breach"

### 2. AI Analysis

If suspicious logs found:

- Prepares concise summary (max 30 logs)
- Sends to Gemini 1.5 Flash model
- Requests JSON response with structured alerts

### 3. Alert Display

Parses AI response and displays:

- Color-coded severity icons
- Threat type classification
- Actionable recommendations
- Affected log sources

## Configuration Storage

API key stored in: `~/.logify/config.json`

```json
{
  "connection_key": "...",
  "gemini_api_key": "AIzaSy..."
}
```

## Disabling AI Alerts

AI alerts are **opt-in** - disabled by default.

To disable after enabling:

1. Delete API key from `~/.logify/config.json`
2. Or set to `null`

## Error Handling

AI analysis failures are non-blocking:

```
⚠ AI analysis skipped: <error reason>
```

Scan continues normally even if AI fails.

## Privacy Considerations

- Logs sent to Google Gemini API
- Privacy-sensitive logs (shell history) flagged as "sensitive"
- Consider implications before enabling for production
- Can opt out of user activity collection with scan flags

## Future Enhancements

- [ ] Support for additional AI providers (Claude, OpenAI)
- [ ] Custom alert rules/patterns
- [ ] Alert history tracking
- [ ] Integration with external SIEM tools
- [ ] Rate limiting / token budget controls
