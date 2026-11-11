import React, { useState, useEffect } from 'react';
import { Wifi, ShieldCheck, Save, Plus, Play, Activity } from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';

const isNonPublicEntry = (entry) => {
  const host = String(entry || '').trim().split('/')[0].replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return false;
  const v4 = host.startsWith('::ffff:') ? host.slice(7) : host;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v4);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  return (
    host === '::' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    /^fe[89ab][0-9a-f]:/i.test(host) ||
    /^f[cd][0-9a-f]{2}:/i.test(host)
  );
};

function parseListInput(text) {
  return String(text || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function WifiConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [networkDisplayName, setNetworkDisplayName] = useState('Institute Campus Wi-Fi');
  const [ipv4Text, setIpv4Text] = useState('');
  const [ipv6Text, setIpv6Text] = useState('');
  const [cidrText, setCidrText] = useState('');
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [deviceRestrictionEnabled, setDeviceRestrictionEnabled] = useState(true);

  const [currentClientIp, setCurrentClientIp] = useState('');
  const [currentClientFamily, setCurrentClientFamily] = useState('');
  const [testIpInput, setTestIpInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [diagData, setDiagData] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagError, setDiagError] = useState(null);

  const [notice, setNotice] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await attendancePortalAPI.getWifiSettings();
      const s = res.data?.settings || {};
      setNetworkDisplayName(s.network_display_name || 'Institute Campus Wi-Fi');
      setIpv4Text((s.allowed_ipv4 || []).join('\n'));
      setIpv6Text((s.allowed_ipv6 || []).join('\n'));
      setCidrText((s.allowed_cidrs || []).join('\n'));
      setOfflineEnabled(Boolean(s.offline_attendance_enabled));
      setOnlineEnabled(Boolean(s.online_attendance_enabled));
      setDeviceRestrictionEnabled(Boolean(s.device_restriction_enabled));

      const detected = res.data?.currentClientIp || '';
      setCurrentClientIp(detected);
      setCurrentClientFamily(res.data?.currentClientFamily || '');
      setTestIpInput((prev) => prev || detected);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const buildPayload = () => ({
    networkDisplayName: networkDisplayName.trim() || 'Institute Campus Wi-Fi',
    allowedIpv4: parseListInput(ipv4Text),
    allowedIpv6: parseListInput(ipv6Text),
    allowedCidrs: parseListInput(cidrText),
    offlineAttendanceEnabled: offlineEnabled,
    onlineAttendanceEnabled: onlineEnabled,
    deviceRestrictionEnabled
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await attendancePortalAPI.updateWifiSettings(buildPayload());
      const s = res.data?.settings;
      if (s) {
        setIpv4Text((s.allowed_ipv4 || []).join('\n'));
        setIpv6Text((s.allowed_ipv6 || []).join('\n'));
        setCidrText((s.allowed_cidrs || []).join('\n'));
      }
      setNotice({ type: 'success', text: 'Wi-Fi & attendance settings saved successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to save Wi-Fi configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNetwork = async () => {
    setTesting(true);
    setTestResult(null);
    setNotice(null);
    try {
      const res = await attendancePortalAPI.testNetworkConfig({
        ...buildPayload(),
        testIp: testIpInput.trim() || undefined
      });
      setTestResult(res.data?.data);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Network test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const isLoopbackIp = currentClientIp === '127.0.0.1' || currentClientIp === '::1';
  const privateConfiguredEntries = [
    ...parseListInput(ipv4Text),
    ...parseListInput(ipv6Text),
    ...parseListInput(cidrText)
  ].filter(isNonPublicEntry);

  const handleInspectDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await attendancePortalAPI.getNetworkDiagnostics();
      setDiagData(res.data?.data || res.data || null);
      setDiagOpen(true);
    } catch (err) {
      setDiagError(err.response?.data?.message || 'Failed to inspect proxy diagnostics.');
    } finally {
      setDiagLoading(false);
    }
  };

  const handleAddCurrentIp = () => {
    if (!currentClientIp) return;
    if (currentClientFamily === 'ipv6') {
      const list = parseListInput(ipv6Text);
      if (!list.includes(currentClientIp)) {
        setIpv6Text([...list, currentClientIp].join('\n'));
      }
    } else {
      const list = parseListInput(ipv4Text);
      if (!list.includes(currentClientIp)) {
        setIpv4Text([...list, currentClientIp].join('\n'));
      }
    }
  };

  const handleAllowLocalhost = () => {
    const v4List = parseListInput(ipv4Text);
    if (!v4List.includes('127.0.0.1')) {
      setIpv4Text([...v4List, '127.0.0.1'].join('\n'));
    }
    const v6List = parseListInput(ipv6Text);
    if (!v6List.includes('::1')) {
      setIpv6Text([...v6List, '::1'].join('\n'));
    }
  };

  if (loading) {
    return (
      <div className="att-panel" style={{ textAlign: 'center', color: '#64748b' }}>
        Loading Wi-Fi configuration...
      </div>
    );
  }

  return (
    <div className="att-grid-2">
      <form className="att-panel" onSubmit={handleSave}>
        <div className="att-panel-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={18} color="#4f46e5" /> Institute Wi-Fi Configuration
          </span>
        </div>

        <div className="att-status-banner info" style={{ marginBottom: 12 }}>
          <span>
            <strong>How to configure:</strong> Open this Admin page on the live deployed site while
            connected to your institute Wi-Fi and click <strong>Add My IP</strong>. IPv6 is optional
            — if your ISP/Wi-Fi only uses IPv4, leave IPv6 blank.
          </span>
        </div>

        {privateConfiguredEntries.length > 0 && (
          <div className="att-status-banner warning" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Warning: Non-public / internal IP entries configured
            </div>
            <div style={{ fontSize: 13 }}>
              Detected non-public entry/entries:{' '}
              <span className="att-mono">{privateConfiguredEntries.join(', ')}</span>. Remove
              private proxy/localhost IPs (e.g. <code>10.x.x.x</code>, <code>127.0.0.1</code>,{' '}
              <code>::1</code>) so only your institute&apos;s public IP/CIDR is trusted in
              production.
            </div>
          </div>
        )}

        {isLoopbackIp && (
          <div className="att-status-banner warning" style={{ marginBottom: 14 }}>
            <div>
              <strong>Running locally on localhost ({currentClientIp}):</strong> Your browser is
              connecting over local loopback rather than your router&apos;s public IP (from
              WhatIsMyIP). To test offline attendance locally on your laptop, allow both{' '}
              <code>127.0.0.1</code> and <code>::1</code>, and remove them before production.
            </div>
            <button
              type="button"
              className="att-recheck-btn"
              onClick={handleAllowLocalhost}
            >
              Allow Localhost
            </button>
          </div>
        )}

        {notice && (
          <div
            className={`att-status-banner ${notice.type === 'success' ? 'verified' : 'unverified'}`}
            style={{ marginBottom: 14 }}
          >
            <span>{notice.text}</span>
          </div>
        )}

        <div className="att-field">
          <label className="att-label" htmlFor="wifi-display-name">
            Network Display Name (Informational Only)
          </label>
          <input
            id="wifi-display-name"
            type="text"
            className="att-input"
            value={networkDisplayName}
            onChange={(e) => setNetworkDisplayName(e.target.value)}
            placeholder="e.g. VCUBE Campus Wi-Fi"
          />
        </div>

        <div className="att-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="att-label" htmlFor="wifi-ipv4" style={{ marginBottom: 0 }}>
              Allowed Public IPv4 Addresses (comma or newline separated)
            </label>
            {currentClientIp && (
              <button
                type="button"
                className="att-btn att-btn-secondary att-btn-sm"
                onClick={handleAddCurrentIp}
              >
                <Plus size={13} /> Add My IP ({currentClientIp})
              </button>
            )}
          </div>
          <textarea
            id="wifi-ipv4"
            rows={3}
            className="att-input att-mono"
            value={ipv4Text}
            onChange={(e) => setIpv4Text(e.target.value)}
            placeholder="e.g. 49.205.120.10"
          />
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="wifi-ipv6">
            Allowed IPv6 Addresses (Optional — leave blank if IPv6 is unavailable)
          </label>
          <textarea
            id="wifi-ipv6"
            rows={2}
            className="att-input att-mono"
            value={ipv6Text}
            onChange={(e) => setIpv6Text(e.target.value)}
            placeholder="e.g. 2401:4900:1c2a::1"
          />
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="wifi-cidrs">
            Allowed CIDR Ranges (IPv4 or IPv6)
          </label>
          <textarea
            id="wifi-cidrs"
            rows={2}
            className="att-input att-mono"
            value={cidrText}
            onChange={(e) => setCidrText(e.target.value)}
            placeholder="e.g. 49.205.120.0/24"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0 18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={offlineEnabled}
              onChange={(e) => setOfflineEnabled(e.target.checked)}
            />
            Enable Offline (Wi-Fi) Attendance
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlineEnabled}
              onChange={(e) => setOnlineEnabled(e.target.checked)}
            />
            Enable Online (Session Code) Attendance
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={deviceRestrictionEnabled}
              onChange={(e) => setDeviceRestrictionEnabled(e.target.checked)}
            />
            Enable Browser Device Restriction (1 Student per Browser UUID)
          </label>
        </div>

        <button type="submit" className="att-btn att-btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>

      {/* Test Network Configuration Panel */}
      <div className="att-panel">
        <div className="att-panel-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="#10b981" /> Test Network Configuration
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
          Verify whether your current network IP or a test IPv4/IPv6 address matches the configured
          institute Wi-Fi rules before saving.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Your Current Detected Public IP
          </div>
          <div className="att-mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
            {currentClientIp || 'Unavailable'}{' '}
            {currentClientFamily && (
              <span className="att-badge att-badge-slate" style={{ marginLeft: 6 }}>
                {currentClientFamily.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="test-ip-input">
            IP Address to Test (IPv4 or IPv6)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="test-ip-input"
              type="text"
              className="att-input att-mono"
              value={testIpInput}
              onChange={(e) => setTestIpInput(e.target.value)}
              placeholder="Enter IPv4 or IPv6 to test"
            />
            <button
              type="button"
              className="att-btn att-btn-secondary"
              onClick={() => setTestIpInput(currentClientIp)}
            >
              Use Mine
            </button>
          </div>
        </div>

        <button
          type="button"
          className="att-btn att-btn-primary"
          onClick={handleTestNetwork}
          disabled={testing}
        >
          <Play size={14} /> {testing ? 'Testing...' : 'Test Network Match'}
        </button>

        <button
          type="button"
          className="att-btn"
          style={{
            marginLeft: 8,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#0f172a'
          }}
          onClick={handleInspectDiagnostics}
          disabled={diagLoading}
        >
          <Activity size={14} /> {diagLoading ? 'Inspecting...' : 'Inspect Proxy Diagnostics'}
        </button>

        {diagError && (
          <div className="att-status-banner error" style={{ marginTop: 12 }}>
            {diagError}
          </div>
        )}

        {diagData && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="att-btn"
              style={{
                padding: '4px 10px',
                fontSize: 12,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                marginBottom: 8
              }}
              onClick={() => setDiagOpen((prev) => !prev)}
            >
              {diagOpen ? 'Hide Proxy Diagnostics JSON' : 'Show Proxy Diagnostics JSON'}
            </button>
            {diagOpen && (
              <pre
                className="att-mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: 12,
                  overflowX: 'auto',
                  lineHeight: 1.5
                }}
              >
                {JSON.stringify(diagData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {testResult && (
          <div
            className={`att-status-banner ${testResult.eligibleForOffline ? 'verified' : 'unverified'}`}
            style={{ marginTop: 16 }}
          >
            <div>
              <strong>
                {testResult.eligibleForOffline
                  ? 'PASS — Eligible for Offline Attendance'
                  : testResult.matched
                  ? 'IP Matched (Offline Attendance Toggle is Disabled)'
                  : 'REJECTED — Not on Verified Wi-Fi'}
              </strong>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                Tested IP: <span className="att-mono">{testResult.testedIp}</span> (
                {testResult.family || 'unknown'})
              </div>
              <div style={{ fontSize: 12.5, marginTop: 3 }}>{testResult.reason}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

