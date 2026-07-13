// Student Performance Component
// Student Execution & Mentorship Platform

import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, AlertTriangle, Activity, Calendar, BarChart3 } from 'lucide-react';
import platformAPI from '../../services/platformAPI';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const StudentPerformance = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [riskLevel, setRiskLevel] = useState('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getStudentPerformance('current', { period: selectedPeriod });
      setPerformanceData(response.data.trends || []);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'low': return <Award className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredData = riskLevel === 'all' 
    ? performanceData 
    : performanceData.filter(item => item.risk_level === riskLevel);

  let averageMetrics;
  if (performanceData.length > 0) {
    const totals = performanceData.reduce((acc, item) => {
      acc.attendance_rate += item.attendance_rate || 0;
      acc.task_completion_rate += item.task_completion_rate || 0;
      acc.participation_score += item.participation_score || 0;
      acc.execution_score += item.execution_score || 0;
      return acc;
    }, { attendance_rate: 0, task_completion_rate: 0, participation_score: 0, execution_score: 0 });

    averageMetrics = {
      attendance_rate: (totals.attendance_rate / performanceData.length).toFixed(1),
      task_completion_rate: (totals.task_completion_rate / performanceData.length).toFixed(1),
      participation_score: (totals.participation_score / performanceData.length).toFixed(1),
      execution_score: (totals.execution_score / performanceData.length).toFixed(1)
    };
  } else {
    averageMetrics = {
      attendance_rate: '0.0',
      task_completion_rate: '0.0',
      participation_score: '0.0',
      execution_score: '0.0'
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Performance</h1>
        <p className="text-gray-600">Track and analyze student performance metrics and trends</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>

        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Students</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="critical">Critical Risk</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Attendance Rate</h3>
              <p className="text-2xl font-bold text-gray-900">{averageMetrics.attendance_rate}%</p>
            </div>
            <div className="text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Task Completion</h3>
              <p className="text-2xl font-bold text-gray-900">{averageMetrics.task_completion_rate}%</p>
            </div>
            <div className="text-blue-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Participation</h3>
              <p className="text-2xl font-bold text-gray-900">{averageMetrics.participation_score}</p>
            </div>
            <div className="text-purple-600">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Execution Score</h3>
              <p className="text-2xl font-bold text-gray-900">{averageMetrics.execution_score}</p>
            </div>
            <div className="text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="attendance_rate" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="task_completion_rate" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="participation_score" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="execution_score" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
          <div className="space-y-3">
            {['low', 'medium', 'high', 'critical'].map((level) => {
              const count = filteredData.filter(item => item.risk_level === level).length;
              return (
                <div key={level} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    {getRiskIcon(level)}
                    <span className="ml-3 font-medium capitalize">{level}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBgColor(level)}`}>
                    {count} students
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {filteredData.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{new Date(item.metric_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">Risk Level: {item.risk_level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-sm font-medium ${getRiskBgColor(item.risk_level)}`}>
                    {item.execution_score}/100
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No performance data available</h3>
          <p className="text-gray-600">No performance data found for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default StudentPerformance;
