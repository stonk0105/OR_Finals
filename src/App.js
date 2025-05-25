import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

export default function ScheduleViewer() {
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
    const startDate = new Date(2025, 2, 3); // 2025年3月3日
    let date = new Date(startDate);
    let currentDay = 1;

    while (currentDay < dayNumber) {
      date.setDate(date.getDate() + 1);
      // 如果是週六或週日，跳過
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
    const startDate = new Date(2025, 2, 3);
    let date = new Date(startDate);
    let currentDay = 1;

    while (currentDay < dayNumber) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
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
    fetch("/schedule.xlsx")
      .then((res) => {
        if (!res.ok) throw new Error("無法載入賽程表");
        return res.arrayBuffer();
      })
      .then((data) => {
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 處理比賽資料，將比賽隊伍分開
        const processedData = jsonData.map(row => {
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
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
      const date = match.dateObject;
      const dateKey = date.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push(match);
    });

    const dates = Object.keys(calendarData).sort();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map(date => (
          <div key={date} className="border rounded-lg p-4 bg-white shadow">
            <h3 className="text-lg font-bold mb-3">
              {new Date(date).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
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
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">每日賽程表</h1>
      
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2"
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
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-gray-600">
            共 {filteredSchedule.length} 場比賽
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded ${
                viewMode === "table" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              表格
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 rounded ${
                viewMode === "calendar" ? "bg-blue-500 text-white" : "bg-gray-200"
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
            <thead className="bg-gray-800 text-white">
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
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <td className="border-t px-6 py-4">
                    <div>第 {row.Day} 天</div>
                    <div className="text-sm text-gray-500">{row.actualDate}</div>
                  </td>
                  <td className="border-t px-6 py-4">{row.convertedField}</td>
                  <td className="border-t px-6 py-4 font-medium">{row.team1 || '-'}</td>
                  <td className="border-t px-6 py-4 text-center text-gray-500">VS</td>
                  <td className="border-t px-6 py-4 font-medium">{row.team2 || '-'}</td>
                  <td className="border-t px-6 py-4">{row.Referee || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        renderCalendar()
      )}
    </div>
  );
}
