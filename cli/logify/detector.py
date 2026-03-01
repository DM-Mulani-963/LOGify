"""
Real-Time Threat Detection Engine for LOGify

Detects malicious activity patterns locally (no AI API needed):
- Brute force: N failed logins from same IP in T seconds
- Port scan: many connection attempts from same IP
- High error rate: spike in ERROR logs
- Malicious patterns: SQL injection, reverse shell, path traversal, etc.
- Flood detection: too many logs from same source in short time
"""

import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Optional
from rich.console import Console

console = Console()

# ─────────────────────────────────────────────────────────────────────────────
# Thresholds (all tunable)
# ─────────────────────────────────────────────────────────────────────────────
BRUTE_FORCE_THRESHOLD = 5       # failed logins from same IP within window
BRUTE_FORCE_WINDOW    = 60      # seconds
PORT_SCAN_THRESHOLD   = 15      # unique dest-port hits from same IP
PORT_SCAN_WINDOW      = 30      # seconds
FLOOD_THRESHOLD       = 50      # log lines from same source in window
FLOOD_WINDOW          = 10      # seconds
ERROR_SPIKE_THRESHOLD = 20      # ERROR logs globally in window
ERROR_SPIKE_WINDOW    = 30      # seconds

# ─────────────────────────────────────────────────────────────────────────────
# Malicious keyword/regex patterns → (threat_type, severity)
# ─────────────────────────────────────────────────────────────────────────────
MALICIOUS_PATTERNS = [
    # Reverse shells
    (r'bash\s+-i\s+>&\s*/dev/tcp',                 'Reverse Shell',       'CRITICAL'),
    (r'nc\s+-e\s+/bin',                             'Reverse Shell',       'CRITICAL'),
    (r'python.*socket.*connect',                    'Reverse Shell',       'HIGH'),
    (r'powershell.*encodedcommand',                 'Encoded Payload',     'CRITICAL'),

    # Web attacks
    (r"union\s+select",                             'SQL Injection',       'HIGH'),
    (r"'\s*or\s+'1'\s*=\s*'1",                     'SQL Injection',       'HIGH'),
    (r"\.\./\.\./",                                 'Path Traversal',      'HIGH'),
    (r"<script[^>]*>",                              'XSS Attempt',         'MEDIUM'),
    (r"eval\s*\(|exec\s*\(",                        'Code Execution',      'HIGH'),
    (r"wget\s+http|curl\s+-[a-z]*\s+http",         'Dropper Download',    'HIGH'),

    # Privilege escalation
    (r"sudo\s+-[a-zA-Z]*s",                         'Privilege Escalation','HIGH'),
    (r"chmod\s+[4-7]777",                           'SUID Backdoor',       'HIGH'),
    (r"/etc/passwd|/etc/shadow",                    'Credential Access',   'HIGH'),

    # Persistence
    (r"crontab\s+-[a-z]*e|/etc/cron",              'Persistence',         'MEDIUM'),
    (r"systemctl\s+enable",                         'Service Persistence', 'LOW'),
    (r"/tmp/\.",                                    'Hidden Tmp File',     'MEDIUM'),

    # Crypto / Malware
    (r"xmrig|cryptonight|monero",                   'Cryptominer',         'HIGH'),
    (r"ransom|encrypt.*files|\.locked",             'Ransomware',          'CRITICAL'),

    # Recon
    (r"nmap|masscan|zmap",                          'Port Scanner',        'MEDIUM'),
    (r"nikto|sqlmap|hydra|medusa",                  'Attack Tool',         'HIGH'),

    # Auth fails (pattern-level, not rate-level)
    (r"failed password|authentication failure|invalid user",
                                                    'Auth Failure',        'LOW'),
]

# Pre-compile regexes for speed
COMPILED_PATTERNS = [
    (re.compile(pat, re.IGNORECASE), threat, sev)
    for pat, threat, sev in MALICIOUS_PATTERNS
]

# ─────────────────────────────────────────────────────────────────────────────
# Shell history specific patterns — commands typed directly by a user/attacker
# ─────────────────────────────────────────────────────────────────────────────
SHELL_HISTORY_PATTERNS = [
    # Reverse shells
    (r'bash\s+-i\s+>&\s*/dev/tcp',                   'Reverse Shell',          'CRITICAL'),
    (r'nc\s+(-e|--exec)\s+/bin',                     'Reverse Shell',          'CRITICAL'),
    (r'python.*-c.*socket.*connect',                  'Reverse Shell',          'CRITICAL'),
    (r'perl.*-e.*socket',                             'Reverse Shell',          'HIGH'),
    (r'socat.*exec.*bash',                            'Reverse Shell',          'CRITICAL'),
    (r'mkfifo\s+/tmp/.*nc\s+',                       'Reverse Shell',          'CRITICAL'),

    # Privilege escalation
    (r'sudo\s+su\b|sudo\s+-i\b|sudo\s+bash\b',      'Root Escalation',        'CRITICAL'),
    (r'sudo\s+chmod\s+[4-7][0-7]{3}\s+/bin/(ba)?sh','SUID Shell Backdoor',    'CRITICAL'),
    (r'chmod\s+[4-7][0-7]{3}\s+/tmp/',              'SUID Backdoor in /tmp',  'CRITICAL'),
    (r'find\s+/.*-perm\s+-4000',                     'SUID Enumeration',       'HIGH'),
    (r'pkexec\s+|polkit',                             'Polkit Escalation',      'HIGH'),
    (r'env\s+.*LD_PRELOAD',                           'LD_PRELOAD Hijack',      'CRITICAL'),
    (r'\$\(id\).*root|id.*uid=0',                   'Root Check',             'MEDIUM'),

    # Persistence
    (r'crontab\s+-e|echo.*>.*cron',                  'Cron Persistence',       'HIGH'),
    (r'echo.*>>\s*/etc/(rc\.local|profile|bashrc|bash_profile|crontab)',
                                                      'RC/Profile Persistence', 'HIGH'),
    (r'systemctl\s+enable\s+\S+',                   'Service Persistence',    'MEDIUM'),
    (r'echo.*>\.ssh/authorized_keys',               'SSH Key Backdoor',       'CRITICAL'),
    (r'cat\s+>>\s*~?\.ssh/authorized_keys',         'SSH Key Backdoor',       'CRITICAL'),

    # Credential access
    (r'cat\s+/etc/shadow|cat\s+/etc/passwd',        'Credential Dump',        'HIGH'),
    (r'unshadow|john\s+--|hashcat',                  'Password Cracking',      'HIGH'),
    (r'mimikatz|lsadump|sekurlsa',                   'Credential Dumping',     'CRITICAL'),
    (r'cat\s+~/.ssh/(id_rsa|id_ed25519)\b',         'SSH Key Theft',          'CRITICAL'),
    (r'history\s*-c|unset\s+HISTFILE|HISTSIZE=0',   'History Clearing',       'HIGH'),

    # Data exfiltration
    (r'curl\s+--data|curl\s+-d\s+.*http',           'Data Exfiltration',      'HIGH'),
    (r'rsync\s+.*@.*:\s*/|scp\s+.*/etc/',           'Remote File Copy',       'HIGH'),
    (r'tar\s+.*\|.*nc\s+',                          'Tar Exfil over Netcat',  'CRITICAL'),
    (r'base64\s+-d.*\|.*bash|echo.*base64.*\|.*bash','Base64 Payload Exec',   'CRITICAL'),
    (r'curl.*\|\s*bash|wget.*\|.*bash',             'Curl Pipe to Bash',      'CRITICAL'),

    # Lateral movement
    (r'ssh\s+-o\s+StrictHostKeyChecking=no',        'SSH No-Check Connect',   'MEDIUM'),
    (r'for\s+ip\s+in|for\s+host\s+in.*ssh',        'SSH Lateral Sweep',      'HIGH'),
    (r'proxychains|sshuttle',                         'Traffic Tunneling',      'HIGH'),

    # Recon / enumeration
    (r'nmap\s+|masscan\s+|zmap\s+',                'Port Scan Tool',         'MEDIUM'),
    (r'nikto|sqlmap|gobuster|dirbuster|wfuzz',       'Web Attack Tool',        'HIGH'),
    (r'hydra|medusa|crackmapexec|ncrack',            'Brute Force Tool',       'HIGH'),
    (r'linpeas|linenum|linux-exploit-suggester',     'Linux Privesc Script',   'HIGH'),
    (r'\bwhoami\b.*&&|id\s*&&.*sudo',               'Recon Chain',            'MEDIUM'),

    # Dropper / malware
    (r'wget\s+.*-O\s+/tmp/|curl\s+.*-o\s+/tmp/',  'Dropper to /tmp',         'HIGH'),
    (r'chmod\s+\+x\s+/tmp/',                       'Execute from /tmp',       'HIGH'),
    (r'xmrig|minerd|cpuminer',                       'Cryptominer',            'HIGH'),
    (r'rm\s+-rf\s+/(?!tmp)',                        'Destructive rm -rf',      'CRITICAL'),

    # Log/trace clearing
    (r'shred\s+|wipe\s+|rm\s+.*\.log',            'Log Deletion',            'HIGH'),
    (r'>\s*/var/log/|truncate.*--size=0.*/var/log', 'Log Truncation',          'HIGH'),
    (r'echo\s+""\s+>\s+/var/log',                  'Log Clearing',            'HIGH'),
]

COMPILED_SHELL_PATTERNS = [
    (re.compile(pat, re.IGNORECASE), threat, sev)
    for pat, threat, sev in SHELL_HISTORY_PATTERNS
]

# Port pattern to extract from log lines
PORT_RE = re.compile(r'(?:DPT|dport|D?PORT)[=:\s]+(\d+)', re.IGNORECASE)

SEVERITY_ORDER = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
SEVERITY_COLORS = {
    'CRITICAL': 'bold red',
    'HIGH':     'red',
    'MEDIUM':   'yellow',
    'LOW':      'cyan',
}
SEVERITY_ICONS = {
    'CRITICAL': '🚨',
    'HIGH':     '⚠️ ',
    'MEDIUM':   '⚡',
    'LOW':      'ℹ️ ',
}


@dataclass
class ThreatEvent:
    threat_type: str
    severity: str
    description: str
    source_ip: Optional[str] = None
    log_source: Optional[str] = None
    recommendation: str = "Investigate immediately."


# ─────────────────────────────────────────────────────────────────────────────
# Sliding-window counter per key
# ─────────────────────────────────────────────────────────────────────────────
class SlidingWindow:
    """Thread-safe-ish sliding time-window counter."""

    def __init__(self, window_secs: int):
        self.window = window_secs
        self._events: deque = deque()  # stores timestamps

    def add(self):
        now = time.time()
        self._events.append(now)
        self._cull(now)

    def count(self) -> int:
        self._cull(time.time())
        return len(self._events)

    def _cull(self, now: float):
        cutoff = now - self.window
        while self._events and self._events[0] < cutoff:
            self._events.popleft()


class SetSlidingWindow:
    """Counts unique values in a sliding window (for port scans)."""

    def __init__(self, window_secs: int):
        self.window = window_secs
        self._events: deque = deque()  # (timestamp, value)

    def add(self, value):
        now = time.time()
        self._events.append((now, value))
        self._cull(now)

    def unique_count(self) -> int:
        self._cull(time.time())
        return len({v for _, v in self._events})

    def _cull(self, now: float):
        cutoff = now - self.window
        while self._events and self._events[0][0] < cutoff:
            self._events.popleft()


# ─────────────────────────────────────────────────────────────────────────────
# Main detector class — one singleton per watcher session
# ─────────────────────────────────────────────────────────────────────────────
class ThreatDetector:
    """
    Stateful real-time threat detector.
    Call .analyze(source, level, message, source_ip, dest_ip, event_id)
    for every log line. Returns a ThreatEvent or None.
    """

    def __init__(self):
        # Per-IP brute force counters
        self._brute: defaultdict[str, SlidingWindow] = defaultdict(
            lambda: SlidingWindow(BRUTE_FORCE_WINDOW)
        )
        # Per-IP port scan counters (unique dest port)
        self._scan: defaultdict[str, SetSlidingWindow] = defaultdict(
            lambda: SetSlidingWindow(PORT_SCAN_WINDOW)
        )
        # Per-source flood counters
        self._flood: defaultdict[str, SlidingWindow] = defaultdict(
            lambda: SlidingWindow(FLOOD_WINDOW)
        )
        # Global error spike counter
        self._errors = SlidingWindow(ERROR_SPIKE_WINDOW)

        # Track already-alerted IPs to avoid spam (reset after 5 min)
        self._alerted_brute:   dict[str, float] = {}
        self._alerted_scan:    dict[str, float] = {}
        self._alerted_flood:   dict[str, float] = {}
        self._error_alerted_at: float = 0

        self.ALERT_COOLDOWN = 300  # seconds between repeat alerts per key

    # ── public API ────────────────────────────────────────────────────────────

    def analyze(
        self,
        source: str,
        level: str,
        message: str,
        source_ip: Optional[str] = None,
        dest_ip: Optional[str] = None,
        event_id: Optional[str] = None,
    ) -> Optional[ThreatEvent]:
        """
        Analyze a single log line. Returns a ThreatEvent if a threat is
        detected, otherwise None.
        """
        # 1. Pattern-based (instant, no state needed)
        threat = self._check_patterns(message, source, source_ip)
        if threat:
            return threat

        # 2. Rate-based: brute force
        if source_ip:
            if self._is_auth_fail(message):
                self._brute[source_ip].add()
                if self._brute[source_ip].count() >= BRUTE_FORCE_THRESHOLD:
                    if self._should_alert('brute', source_ip):
                        return ThreatEvent(
                            threat_type='Brute Force',
                            severity='HIGH',
                            description=(
                                f"{self._brute[source_ip].count()} failed auth "
                                f"attempts from {source_ip} in {BRUTE_FORCE_WINDOW}s"
                            ),
                            source_ip=source_ip,
                            log_source=source,
                            recommendation=f"Block IP {source_ip} with: sudo ufw deny from {source_ip}",
                        )

            # 3. Rate-based: port scan
            dport = self._extract_dport(message)
            if dport:
                self._scan[source_ip].add(dport)
                if self._scan[source_ip].unique_count() >= PORT_SCAN_THRESHOLD:
                    if self._should_alert('scan', source_ip):
                        return ThreatEvent(
                            threat_type='Port Scan',
                            severity='HIGH',
                            description=(
                                f"{self._scan[source_ip].unique_count()} unique ports "
                                f"probed by {source_ip} in {PORT_SCAN_WINDOW}s"
                            ),
                            source_ip=source_ip,
                            log_source=source,
                            recommendation=f"Block scanner: sudo ufw deny from {source_ip}",
                        )

        # 4. Rate-based: source flood
        self._flood[source].add()
        if self._flood[source].count() >= FLOOD_THRESHOLD:
            if self._should_alert('flood', source):
                return ThreatEvent(
                    threat_type='Log Flood',
                    severity='MEDIUM',
                    description=(
                        f"{self._flood[source].count()} log lines from "
                        f"'{source}' in {FLOOD_WINDOW}s — possible DoS or misconfiguration"
                    ),
                    log_source=source,
                    recommendation="Investigate the source for runaway process or flood.",
                )

        # 5. Global error spike
        if level in ('ERROR', 'CRITICAL'):
            self._errors.add()
            if self._errors.count() >= ERROR_SPIKE_THRESHOLD:
                if self._should_alert('error', '_global_'):
                    return ThreatEvent(
                        threat_type='Error Spike',
                        severity='MEDIUM',
                        description=(
                            f"{self._errors.count()} ERROR/CRITICAL logs in "
                            f"{ERROR_SPIKE_WINDOW}s — system may be under attack or failing"
                        ),
                        recommendation="Check recent ERROR logs for root cause.",
                    )

        return None

    def analyze_shell_command(
        self,
        command: str,
        shell_file: str,
        user: Optional[str] = None,
    ) -> Optional[ThreatEvent]:
        """
        Check a single shell history command against shell-specific patterns.
        Returns a ThreatEvent if the command is suspicious, None otherwise.
        """
        for regex, threat_type, severity in COMPILED_SHELL_PATTERNS:
            if regex.search(command):
                who = f"user '{user}'" if user else f"history file '{shell_file}'"
                return ThreatEvent(
                    threat_type=threat_type,
                    severity=severity,
                    description=f"[Shell History] {threat_type} detected in {who}: {command[:120]}",
                    log_source=shell_file,
                    recommendation=self._recommend(threat_type),
                )
        return None

    # ── private helpers ───────────────────────────────────────────────────────

    def _check_patterns(self, message: str, source: str, source_ip) -> Optional[ThreatEvent]:
        for regex, threat_type, severity in COMPILED_PATTERNS:
            if regex.search(message):
                # Skip low-severity auth failures (handled by rate checker)
                if threat_type == 'Auth Failure':
                    return None
                return ThreatEvent(
                    threat_type=threat_type,
                    severity=severity,
                    description=f"Pattern '{threat_type}' matched in log from '{source}'",
                    source_ip=source_ip,
                    log_source=source,
                    recommendation=self._recommend(threat_type),
                )
        return None

    @staticmethod
    def _is_auth_fail(message: str) -> bool:
        msg = message.lower()
        return any(k in msg for k in (
            'failed password', 'authentication failure', 'invalid user',
            'failed login', 'access denied', 'login failed', 'wrong password',
        ))

    @staticmethod
    def _extract_dport(message: str) -> Optional[str]:
        m = PORT_RE.search(message)
        return m.group(1) if m else None

    def _should_alert(self, kind: str, key: str) -> bool:
        """Suppress duplicate alerts within cooldown period."""
        store = {
            'brute': self._alerted_brute,
            'scan':  self._alerted_scan,
            'flood': self._alerted_flood,
            'error': self._alerted_brute,  # reuse store; key='_global_'
        }[kind]
        now = time.time()
        last = store.get(key, 0)
        if now - last >= self.ALERT_COOLDOWN:
            store[key] = now
            return True
        return False

    @staticmethod
    def _recommend(threat_type: str) -> str:
        recs = {
            'Reverse Shell':       'Kill the process immediately: sudo ss -tp | grep <port>',
            'SQL Injection':       'Review WAF / application logs and patch input validation.',
            'Path Traversal':      'Patch web app input sanitization; check accessed files.',
            'XSS Attempt':         'Check if payload was reflected; review CSP headers.',
            'Code Execution':      'Isolate the host; perform forensics on execution context.',
            'Dropper Download':    'Block outbound wget/curl; check /tmp for new binaries.',
            'Privilege Escalation':'Audit sudoers; check SUID binaries with: find / -perm -4000',
            'SUID Backdoor':       'Investigate file: remove SUID and audit who changed it.',
            'Credential Access':   'Rotate credentials; check /etc/passwd and /etc/shadow.',
            'Port Scanner':        'Block source IP; review firewall rules.',
            'Cryptominer':         'Kill miner process; audit cron and startup scripts.',
            'Ransomware':          '🚨 ISOLATE HOST IMMEDIATELY. Do not pay ransom.',
            'Persistence':         'Audit cron jobs and systemd services for unknown entries.',
            'Attack Tool':         'Block source IP; review affected services.',
            'Encoded Payload':     'Decode and analyze the payload; check for execution.',
        }
        return recs.get(threat_type, 'Investigate the log entry immediately.')


# ─────────────────────────────────────────────────────────────────────────────
# Alert display helper
# ─────────────────────────────────────────────────────────────────────────────
def display_threat(event: ThreatEvent):
    """Print a rich-formatted threat alert to the console."""
    icon  = SEVERITY_ICONS.get(event.severity, '⚡')
    color = SEVERITY_COLORS.get(event.severity, 'yellow')
    
    console.print()
    console.rule(f"[{color}]{icon} THREAT DETECTED: {event.threat_type}[/{color}]")
    console.print(f"  [{color}]Severity   :[/{color}] {event.severity}")
    console.print(f"  [{color}]Description:[/{color}] {event.description}")
    if event.source_ip:
        console.print(f"  [{color}]Source IP  :[/{color}] {event.source_ip}")
    if event.log_source:
        console.print(f"  [{color}]Log Source :[/{color}] {event.log_source}")
    console.print(f"  [{color}]Action     :[/{color}] {event.recommendation}")
    console.rule(style=color)
    console.print()
