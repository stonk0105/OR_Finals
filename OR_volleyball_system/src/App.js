import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ScheduleGenerator from './ScheduleGenerator';
import ScheduleViewer from './ScheduleViewer';

function Home() {
  const [file, setFile] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
  };

  const handleGenerateSchedule = async () => {
    if (!file || !startDate) {
      alert("請上傳 Excel 並輸入開始日期！");
      return;
    }

    setLoading(true);
    try {
      // 保存上传的文件
      const formData = new FormData();
      formData.append('file', file);
      
      // 调用后端API
      const response = await fetch('/api/generate-groups', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('生成分組失敗');
      }

      const result = await response.json();
      
      // 创建Excel文件
      const workbook = XLSX.utils.book_new();
      
      // 添加分组数据
      const groupingSheet = XLSX.utils.json_to_sheet(result.grouping_data);
      XLSX.utils.book_append_sheet(workbook, groupingSheet, "Groupings");
      
      // 添加裁判冲突表
      const refConflictSheet = XLSX.utils.json_to_sheet(result.ref_conflict_data);
      XLSX.utils.book_append_sheet(workbook, refConflictSheet, "Referee Conflicts");
      
      // 输出文件
      const wbout = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      FileSaver.saveAs(new Blob([wbout], { type: "application/octet-stream" }), "group_generate.xlsx");
      
      // 跳转到排程页面
      navigate('/schedule-generator', { state: { startDate } });
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "生成過程中發生錯誤，請檢查檔案格式是否正確。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stripe font-sans">
      {/* 左上角單一排球 Emoji */}
      

      {/* 前景內容 */}
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-xl border-4 border-yellow-400 relative z-10">
        <h1 className="text-3xl font-extrabold text-blue-900 text-center mb-6">🏐 台大盃排球賽程生成器</h1>

        <div className="mb-4">
          <label className="block text-blue-900 font-extrabold mb-2">📂 上傳評審系所及隊伍分級表：</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="w-full p-2 border-2 border-yellow-300 rounded-md bg-blue-50"
          />
        </div>

        <div className="mb-4">
          <label className="block text-blue-900 font-extrabold mb-2">📅 輸入起始日期：</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border-2 border-yellow-300 rounded-md bg-blue-50"
          />
        </div>

        <button
          onClick={handleGenerateSchedule}
          disabled={loading}
          className={`w-full py-3 px-4 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold rounded-lg transition duration-200 shadow-md ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? '生成中...' : '生成分組和裁判衝突表'}
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule-generator" element={<ScheduleGenerator />} />
        <Route path="/schedule-viewer" element={<ScheduleViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
