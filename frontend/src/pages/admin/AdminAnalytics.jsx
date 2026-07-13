// Admin Analytics Dashboard
// Student Execution & Mentorship Platform

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import platformAPI from '../../services/platformAPI'
import Button from '../../components/common/Button'
import {
  Users, Activity, TrendingUp, AlertTriangle, BarChart3,
  Calendar, Clock, CheckCircle, XCircle, Award, Target,
  BookOpen, Video, MessageSquare, Download, Filter, RefreshCw,
  Eye, Settings, LogOut, UserCheck, UserX, Zap, Shield
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#f97316', '#06b6d4']

const AdminAnalytics = () => {
  const { user } = useAuth()
  
  // State for analytics data
  const [systemOverview, setSystemOverview] = useState(null)
  const [userMetrics, setUserMetrics] = useState([])
  const [batchComparisons, setBatchComparisons] = useState([])
  const [facultyPerformance, setFacultyPerformance] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [performanceTrends, setPerformanceTrends] = useState([])
  const [riskAnalysis, setRiskAnalysis] = useState([])
  const [attendanceAnalytics, setAttendanceAnalytics] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days
  const [selectedTab, setSelectedTab] = useState('overview')
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      const [
        overviewRes,
        userMetricsRes,
        batchRes,
        facultyRes,
        logsRes,
        trendsRes,
        riskRes,
        attendanceRes
      ] = await Promise.all([
        platformAPI.getSystemOverview(),
        platformAPI.getUsersByRole('student'),
        platformAPI.getBatchComparisons({ period: dateRange }),
        platformAPI.getFacultyPerformance({ period: dateRange }),
        platformAPI.getActivityLogs({ limit: 100 }),
        platformAPI.getPerformanceAnalytics({ period: dateRange }),
        platformAPI.getRiskAnalysis({ period: dateRange }),
        platformAPI.getAttendanceAnalytics({ period: dateRange })
      ])

      setSystemOverview(overviewRes.data)
      setUserMetrics(userMetricsRes.data)
      setBatchComparisons(batchRes.data)
      setFacultyPerformance(facultyRes.data)
      setActivityLogs(logsRes.data)
      setPerformanceTrends(trendsRes.data.trends || [])
      setRiskAnalysis(riskRes.data)
      setAttendanceAnalytics(attendanceRes.data)
      
    } catch (error) {
      console.error('Analytics data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  const exportData = (dataType) => {
    // Implementation for exporting analytics data
    console.log(`Exporting ${dataType} data...`)
  }

  const renderSystemOverview = () => {
    if (!systemOverview) return null

    const overviewCards = [
      {
        title: 'Total Users',
        value: systemOverview.total_users || 0,
        change: systemOverview.user_growth || 0,
        icon: Users,
        color: 'bg-blue-500'
      },
      {
        title: 'Active Sessions',
        value: systemOverview.active_sessions || 0,
        change: systemOverview.session_growth || 0,
        icon: Video,
        color: 'bg-green-500'
      },
      {
        title: 'Avg Attendance',
        value: `${systemOverview.avg_attendance || 0}%`,
        change: systemOverview.attendance_trend || 0,
        icon: CheckCircle,
        color: 'bg-purple-500'
      },
      {
        title: 'Completion Rate',
        value: `${systemOverview.completion_rate || 0}%`,
        change: systemOverview.completion_trend || 0,
        icon: Award,
        color: 'bg-orange-500'
      },
      {
        title: 'Risk Students',
        value: systemOverview.risk_students || 0,
        change: systemOverview.risk_trend || 0,
        icon: AlertTriangle,
        color: 'bg-red-500'
      },
      {
        title: 'System Health',
        value: `${systemOverview.system_health || 0}%`,
        change: systemOverview.health_trend || 0,
        icon: Shield,
        color: 'bg-teal-500'
      }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {overviewCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                <div className="flex items-center mt-2">
                  {card.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-500 mr-1 transform rotate-180" />
                  )}
                  <span className={`text-sm ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(card.change)}%
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderBatchComparisons = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={batchComparisons}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avg_performance" fill="#4f46e5" />
            <Bar dataKey="attendance_rate" fill="#10b981" />
            <Bar dataKey="completion_rate" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderPerformanceTrends = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2} />
            <Line type="monotone" dataKey="completion" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="execution" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderRiskAnalysis = () => {
    const riskData = [
      { name: 'Low Risk', value: riskAnalysis.low_risk || 0, color: '#10b981' },
      { name: 'Medium Risk', value: riskAnalysis.medium_risk || 0, color: '#f59e0b' },
      { name: 'High Risk', value: riskAnalysis.high_risk || 0, color: '#ef4444' },
      { name: 'Critical', value: riskAnalysis.critical_risk || 0, color: '#dc2626' }
    ]

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {riskData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderFacultyPerformance = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facultyPerformance.map((faculty, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {faculty.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {faculty.total_sessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-2">{faculty.rating}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(faculty.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {faculty.feedback_score}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderActivityLogs = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Button variant="outline" size="sm" onClick={() => exportData('activity-logs')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activityLogs.map((log, index) => (
            <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{log.user_name}</span>
                  <span className="text-gray-500"> {log.action}</span>
                  <span className="text-gray-500"> {log.entity_type}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive platform overview and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'batches', 'faculty', 'activity', 'risks'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {renderSystemOverview()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {renderPerformanceTrends()}
              {renderRiskAnalysis()}
            </div>
          </div>
        )}

        {selectedTab === 'batches' && (
          <div className="space-y-8">
            {renderBatchComparisons()}
            {renderPerformanceTrends()}
          </div>
        )}

        {selectedTab === 'faculty' && (
          <div className="space-y-8">
            {renderFacultyPerformance()}
          </div>
        )}

        {selectedTab === 'activity' && (
          <div className="space-y-8">
            {renderActivityLogs()}
          </div>
        )}

        {selectedTab === 'risks' && (
          <div className="space-y-8">
            {renderRiskAnalysis()}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Mitigation Recommendations</h3>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">High Risk Students Detected</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Consider implementing intervention strategies for students with attendance below 60%.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex">
                    <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Performance Optimization</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Batch B shows 15% lower completion rates. Consider additional mentoring resources.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Star = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

export default AdminAnalytics
