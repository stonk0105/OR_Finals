import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useLocation, useNavigate } from "react-router-dom";

export default function ScheduleViewer() {
  const location = useLocation();
  const scheduleFromRouter = location.state?.scheduleData || [];
  const startDate = location.state?.startDate || "2025-01-01"; // 預設日期
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState([]);
  const [filteredSchedule, setFilteredSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState("全部");
  const [selectedTeam, setSelectedTeam] = useState("全部");
  const [selectedReferee, setSelectedReferee] = useState("全部");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'table' 或 'calendar'

  // 將日期轉換為實際日期，跳過週末
  const getActualDate = (dayNumber) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    let date = new Date(baseDate);
    let currentDay = 1;

    while (currentDay < dayNumber) {
      date.setDate(date.getDate() + 1);
      // 跳過週末
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        currentDay++;
      }
    }

    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 獲取日期物件（用於行事曆）
  const getDateObject = (dayNumber) => {
    const [year, month, day] = startDate.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    let date = new Date(baseDate);
    let currentDay = 1;

    while (currentDay < dayNumber) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 1 && date.getDay() !== 0) {
        currentDay++;
      }
    }

    return date;
  };

  // 轉換場地編號
  const convertFieldNumber = (field) => {
    if (!field && field !== 0) return '-';
    const fieldNum = parseInt(field);
    if (isNaN(fieldNum)) return field;
    return `場地 ${fieldNum + 4}`;
  };

  // 安全的字串轉換函數
  const safeToString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).toLowerCase();
  };

  useEffect(() => {
    if (!scheduleFromRouter.length) {
      setError("未找到賽程資料，請先生成賽程");
      setLoading(false);
      return;
    }

    const processedData = scheduleFromRouter.map(row => {
      const [team1, team2] = (row.Match || '').split(' vs ');
      return {
        ...row,
        team1: team1?.trim() || '',
        team2: team2?.trim() || '',
        actualDate: getActualDate(row.Day),
        dateObject: getDateObject(row.Day),
        convertedField: convertFieldNumber(row.Field)
      };
    });

    setSchedule(processedData);
    setFilteredSchedule(processedData);
    setLoading(false);
  }, [scheduleFromRouter]);

  useEffect(() => {
    let filtered = schedule;
    
    if (selectedDay !== "全部") {
      filtered = filtered.filter((row) => row.Day === selectedDay);
    }
    
    if (selectedTeam !== "全部") {
      filtered = filtered.filter(
        (row) => row.team1 === selectedTeam || row.team2 === selectedTeam
      );
    }

    if (selectedReferee !== "全部") {
      filtered = filtered.filter(
        (row) => row.Referee === selectedReferee
      );
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          safeToString(row.team1).includes(searchLower) ||
          safeToString(row.team2).includes(searchLower) ||
          safeToString(row.Referee).includes(searchLower) ||
          safeToString(row.convertedField).includes(searchLower)
      );
    }
    
    setFilteredSchedule(filtered);
  }, [selectedDay, selectedTeam, selectedReferee, searchTerm, schedule]);

  // 獲取所有球隊列表
  const getAllTeams = () => {
    const teams = new Set();
    schedule.forEach(row => {
      if (row.team1) teams.add(row.team1);
      if (row.team2) teams.add(row.team2);
    });
    return Array.from(teams).sort();
  };

  // 獲取所有裁判列表
  const getAllReferees = () => {
    const referees = new Set();
    schedule.forEach(row => {
      if (row.Referee) referees.add(row.Referee);
    });
    return Array.from(referees).sort();
  };

  // 渲染行事曆視圖
  const renderCalendar = () => {
    const calendarData = {};
    filteredSchedule.forEach(match => {
      // 用 getActualDate 計算日期字串，確保與表格一致
      const dateKey = getActualDate(match.Day);
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(match);
    });

    const dates = Object.keys(calendarData).sort((a, b) => new Date(a) - new Date(b));
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map(date => (
          <div key={date} className="border rounded-lg p-4 bg-white shadow">
            <h3 className="text-lg font-bold mb-3">
              {date}
            </h3>
            <div className="space-y-3">
              {calendarData[date].map((match, idx) => (
                <div key={idx} className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{match.team1}</span>
                    <span className="text-gray-500">VS</span>
                    <span className="font-medium">{match.team2}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    場地：{match.convertedField} | 裁判：{match.Referee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const uniqueDays = ["全部", ...new Set(schedule.map((row) => row.Day))];
  const allTeams = ["全部", ...getAllTeams()];
  const allReferees = ["全部", ...getAllReferees()];

  if (loading) return <div className="text-center p-8">載入中...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stripe font-sans">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-6xl border-4 border-yellow-400 relative z-10">
        <h1 className="text-3xl font-extrabold text-blue-900 text-center mb-6">🏐 每日賽程表</h1>
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="border-2 border-yellow-300 rounded-md px-2 py-2 bg-blue-50 text-blue-900 font-bold"
            >
              {uniqueDays.map((day) => (
                <option key={day} value={day}>
                  {day === "全部" ? "全部日期" : `第 ${day} 天 (${getActualDate(day)})`}
                </option>
              ))}
            </select>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="border-2 border-yellow-300 rounded-md px-3 py-2 bg-blue-50 text-blue-900 font-bold"
            >
              {allTeams.map((team) => (
                <option key={team} value={team}>
                  {team === "全部" ? "全部球隊" : team}
                </option>
              ))}
            </select>
            <select
              value={selectedReferee}
              onChange={(e) => setSelectedReferee(e.target.value)}
              className="border-2 border-yellow-300 rounded-md px-3 py-2 bg-blue-50 text-blue-900 font-bold"
            >
              {allReferees.map((referee) => (
                <option key={referee} value={referee}>
                  {referee === "全部" ? "全部裁判" : referee}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="搜尋球隊、裁判或場地..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-2 border-yellow-300 rounded-md px-3 py-2 w-64 bg-blue-50 text-blue-900 font-bold"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-blue-900 font-bold">
              共 {filteredSchedule.length} 場比賽
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 rounded font-bold border-2 border-yellow-400 transition duration-200 shadow-md ${
                  viewMode === "table"
                    ? "bg-yellow-400 text-blue-900"
                    : "bg-blue-50 text-blue-900 hover:bg-yellow-100"
                }`}
              >
                表格
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1 rounded font-bold border-2 border-yellow-400 transition duration-200 shadow-md ${
                  viewMode === "calendar"
                    ? "bg-yellow-400 text-blue-900"
                    : "bg-blue-50 text-blue-900 hover:bg-yellow-100"
                }`}
              >
                行事曆
              </button>
            </div>
          </div>
        </div>
        {viewMode === "table" ? (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full border-collapse">
              <thead className="bg-blue-900 text-yellow-300">
                <tr>
                  <th className="px-6 py-3 text-left">日期</th>
                  <th className="px-6 py-3 text-left">場地</th>
                  <th className="px-6 py-3 text-left">主隊</th>
                  <th className="px-6 py-3 text-center">VS</th>
                  <th className="px-6 py-3 text-left">客隊</th>
                  <th className="px-6 py-3 text-left">裁判</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredSchedule.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-yellow-100 transition-colors duration-200"
                  >
                    <td className="border-t px-6 py-4">
                      <div className="font-bold text-blue-900">第 {row.Day} 天</div>
                      <div className="text-sm text-gray-500">{row.actualDate}</div>
                    </td>
                    <td className="border-t px-6 py-4 font-bold text-blue-900">{row.convertedField}</td>
                    <td className="border-t px-6 py-4 font-medium text-blue-900">{row.team1 || '-'}</td>
                    <td className="border-t px-6 py-4 text-center text-yellow-400 font-extrabold">VS</td>
                    <td className="border-t px-6 py-4 font-medium text-blue-900">{row.team2 || '-'}</td>
                    <td className="border-t px-6 py-4 text-blue-900">{row.Referee || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          renderCalendar()
        )}
      </div>
    </div>
  );
}
