import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  History,
  Wifi,
  Smartphone,
  ClipboardEdit,
  Globe,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useCourse } from '../../context/CourseContext';
import { attendancePortalAPI } from '../../services/api';
import TodayAttendanceTab from './TodayAttendanceTab';
import HistoryAttendanceTab from './HistoryAttendanceTab';
import WifiConfigTab from './WifiConfigTab';
import DeviceManagementTab from './DeviceManagementTab';
import ManualAttendanceTab from './ManualAttendanceTab';
import OnlineSessionsTab from './OnlineSessionsTab';
import './Attendance.css';

const TABS = [
  { id: 'today', label: "Today's Attendance", icon: CalendarCheck },
  { id: 'history', label: 'Attendance History', icon: History },
  { id: 'wifi', label: 'Wi-Fi Configuration', icon: Wifi },
  { id: 'devices', label: 'Device Management', icon: Smartphone },
  { id: 'manual', label: 'Manual Attendance', icon: ClipboardEdit },
  { id: 'sessions', label: 'Online Sessions', icon: Globe }
];

export default function AttendanceManagement() {
  const { currentCourse } = useCourse();
  const [activeTab, setActiveTab] = useState('today');
  const [scope, setScope] = useState('all'); // 'all' | 'course'
  const [batches, setBatches] = useState([]);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);

  const portalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/attendance` : '/attendance';

  useEffect(() => {
    attendancePortalAPI
      .getBatches({ scope })
      .then((res) => setBatches(res.data?.batches || []))
      .catch(() => setBatches([]));
  }, [scope, currentCourse?.id]);

  const handleCopyPortalUrl = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedPortalUrl(true);
      setTimeout(() => setCopiedPortalUrl(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  return (
    <div className="att-admin-page">
      <div className="att-admin-header">
        <div>
          <h1>Attendance Management</h1>
          <p>
            Manage campus Wi-Fi verification, online session codes, registered devices, manual
            adjustments, and attendance reports (Asia/Kolkata IST).
          </p>
        </div>

        <div className="att-admin-actions">
          <select
            className="att-filter-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="Course Scope"
          >
            <option value="course">
              Current Course ({currentCourse?.short_name || currentCourse?.name || 'Active'})
            </option>
            <option value="all">All Courses (Institute-Wide)</option>
          </select>

          <button
            type="button"
            className="att-btn att-btn-secondary att-btn-sm"
            onClick={handleCopyPortalUrl}
          >
            {copiedPortalUrl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copiedPortalUrl ? 'Portal URL Copied' : 'Copy /attendance URL'}
          </button>

          <a
            href="/attendance"
            target="_blank"
            rel="noopener noreferrer"
            className="att-btn att-btn-primary att-btn-sm"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open Student Portal
          </a>
        </div>
      </div>

      <div className="att-tabs-bar" role="tablist" aria-label="Attendance Management Sections">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`att-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'today' && <TodayAttendanceTab scope={scope} batches={batches} />}
      {activeTab === 'history' && <HistoryAttendanceTab scope={scope} batches={batches} />}
      {activeTab === 'wifi' && <WifiConfigTab />}
      {activeTab === 'devices' && <DeviceManagementTab />}
      {activeTab === 'manual' && <ManualAttendanceTab scope={scope} />}
      {activeTab === 'sessions' && <OnlineSessionsTab scope={scope} batches={batches} />}
    </div>
  );
}

