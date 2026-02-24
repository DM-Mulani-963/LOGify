"""
AI Security Alert System for LOGify

Uses Google Gemini API to analyze logs for:
- Malware activity
- Brute force attacks
- Suspicious command execution
- SQL injection attempts
- Privilege escalation
- Data exfiltration

Minimal token usage: Only sends suspicious log patterns, not all logs.
"""

import os
import json
from typing import List, Dict, Optional
from pathlib import Path
from rich.console import Console

console = Console()

# Suspicious patterns that trigger AI analysis
SUSPICIOUS_PATTERNS = [
    # Security indicators
    'failed password',
    'authentication failure',
    'sudo',
    'rm -rf',
    'wget',
    'curl',
    'nc -l',  # netcat listener
    'chmod 777',
    'chmod +x',
    
    # Web attacks
    'sql',
    'union select',
    '../',  # Path traversal
    '<script',  # XSS
    'eval(',
    'exec(',
    
    # Malware indicators
    'cryptominer',
    'ransomware',
    '/tmp/.',  # Hidden files in tmp
    'base64',
    'encoded',
    
    # Network suspicious
    'port scan',
    'ddos',
    'syn_recv',
]

ALERT_LEVELS = {
    'CRITICAL': '🚨',
    'HIGH': '⚠️',
    'MEDIUM': '⚡',
    'LOW': 'ℹ️'
}


class AIAnalyzer:
    """AI-powered log analyzer using Google Gemini"""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize AI analyzer with API key from env or parameter"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.enabled = bool(self.api_key)
        
        if self.enabled:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                console.print("[green]✓ AI Alert System enabled (Gemini)[/green]")
            except ImportError:
                console.print("[yellow]⚠ Install google-generativeai: pip install google-generativeai[/yellow]")
                self.enabled = False
            except Exception as e:
                console.print(f"[red]✗ AI initialization failed: {e}[/red]")
                self.enabled = False
        else:
            console.print("[dim]AI Alert System disabled (no API key)[/dim]")
    
    def is_suspicious(self, log_entry: Dict) -> bool:
        """Quick pattern-based check before expensive AI call"""
        message = log_entry.get('message', '').lower()
        source = log_entry.get('source', '').lower()
        
        # Check for suspicious patterns
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern in message or pattern in source:
                return True
        
        # High severity logs
        if log_entry.get('level') in ['ERROR', 'CRITICAL']:
            if any(keyword in message for keyword in ['fail', 'attack', 'breach', 'unauthorized']):
                return True
        
        return False
    
    def analyze_batch(self, logs: List[Dict], max_logs: int = 50) -> List[Dict]:
        """
        Analyze a batch of logs for security threats
        
        Args:
            logs: List of log entries
            max_logs: Maximum logs to analyze (token limit)
        
        Returns:
            List of alerts with severity and description
        """
        if not self.enabled:
            return []
        
        # Filter to suspicious logs only
        suspicious_logs = [log for log in logs if self.is_suspicious(log)][:max_logs]
        
        if not suspicious_logs:
            return []
        
        # Prepare concise summary for AI
        log_summary = self._prepare_summary(suspicious_logs)
        
        # AI prompt for security analysis
        prompt = f"""You are a security analyst. Analyze these suspicious log entries for potential threats:

{log_summary}

Identify:
1. Malware activity
2. Brute force attacks  
3. Privilege escalation attempts
4. SQL injection or XSS attempts
5. Data exfiltration
6. Suspicious file operations

For each threat found, respond in JSON format:
{{
  "alerts": [
    {{
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "threat_type": "malware|brute_force|injection|other",
      "description": "Brief description",
      "affected_logs": ["log source 1", "log source 2"],
      "recommendation": "What to do"
    }}
  ]
}}

If no threats found, return {{"alerts": []}}"""
        
        try:
            response = self.model.generate_content(prompt)
            result_text = response.text
            
            # Extract JSON from response
            if '```json' in result_text:
                result_text = result_text.split('```json')[1].split('```')[0]
            elif '```' in result_text:
                result_text = result_text.split('```')[1].split('```')[0]
            
            result = json.loads(result_text.strip())
            return result.get('alerts', [])
            
        except json.JSONDecodeError:
            console.print(f"[yellow]⚠ AI returned invalid JSON, trying to parse...[/yellow]")
            return []
        except Exception as e:
            console.print(f"[red]✗ AI analysis failed: {e}[/red]")
            return []
    
    def _prepare_summary(self, logs: List[Dict]) -> str:
        """Create concise log summary for AI (minimize tokens)"""
        summary_lines = []
        
        for i, log in enumerate(logs[:30], 1):  # Max 30 logs
            source = Path(log.get('source', 'unknown')).name
            level = log.get('level', 'INFO')
            message = log.get('message', '')[:100]  # Truncate long messages
            
            summary_lines.append(f"{i}. [{level}] {source}: {message}")
        
        return '\n'.join(summary_lines)


def analyze_and_alert(logs: List[Dict]) -> List[Dict]:
    """
    Main function to analyze logs and generate alerts
    
    Args:
        logs: Recent log entries to analyze
    
    Returns:
        List of security alerts
    """
    analyzer = AIAnalyzer()
    
    if not analyzer.enabled:
        return []
    
    alerts = analyzer.analyze_batch(logs)
    
    # Display alerts
    if alerts:
        console.print("\n[bold red]🚨 SECURITY ALERTS DETECTED[/bold red]")
        console.print("=" * 60)
        
        for alert in alerts:
            severity = alert.get('severity', 'MEDIUM')
            icon = ALERT_LEVELS.get(severity, 'ℹ️')
            threat = alert.get('threat_type', 'unknown')
            desc = alert.get('description', 'No description')
            recommend = alert.get('recommendation', 'Investigate')
            
            console.print(f"\n{icon} [{severity}] {threat.upper()}")
            console.print(f"   {desc}")
            console.print(f"   💡 Recommendation: {recommend}")
            
            if 'affected_logs' in alert:
                console.print(f"   📋 Affected: {', '.join(alert['affected_logs'][:3])}")
        
        console.print("\n" + "=" * 60)
    
    return alerts


def quick_ask(question: str, recent_logs: List[Dict], max_context: int = 20) -> str:
    """
    Ask AI a quick question about recent logs
    
    Args:
        question: User's question
        recent_logs: Recent log context
        max_context: Max logs to include (token limit)
    
    Returns:
        AI response
    """
    analyzer = AIAnalyzer()
    
    if not analyzer.enabled:
        return "❌ AI not configured. Use: logify set-ai-api gemini <API_KEY>"
    
    # Prepare minimal context
    log_summary = analyzer._prepare_summary(recent_logs[:max_context])
    
    prompt = f"""Based on these recent logs:

{log_summary}

User question: {question}

Provide a brief, helpful answer (max 3 sentences)."""
    
    try:
        response = analyzer.model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"❌ AI query failed: {e}"
