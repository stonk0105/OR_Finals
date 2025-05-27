import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { useLocation, useNavigate } from 'react-router-dom';

function ScheduleGenerator() {
  const location = useLocation();
  const startDate = location.state?.startDate || "2025-01-01";
  const navigate = useNavigate();
  const [groupFile, setGroupFile] = useState(null);
  const [availabilityFile, setAvailabilityFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGroupFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setGroupFile(uploadedFile);
  };

  const handleAvailabilityFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setAvailabilityFile(uploadedFile);
  };

  const handleGenerateSchedule = async () => {
    if (!groupFile || !availabilityFile) {
      alert("請上傳分組檔案和可用性檔案！");
      return;
    }

    setLoading(true);
    try {
      // 保存上传的文件
      const formData = new FormData();
      formData.append('group_file', groupFile);
      formData.append('availability_file', availabilityFile);
      
      // 调用后端API
      const response = await fetch('/api/generate-schedule', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('生成賽程失敗');
      }

      const result = await response.json();
      
      // 创建Excel文件
      const workbook = XLSX.utils.book_new();
      
      // 添加赛程数据
      const scheduleSheet = XLSX.utils.json_to_sheet(result.schedule_data);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, "Schedule");
      
      // 添加裁判统计
      const refCountSheet = XLSX.utils.json_to_sheet(result.ref_count_data);
      XLSX.utils.book_append_sheet(workbook, refCountSheet, "Referee Counts");
      
      // 添加分组信息
      const groupingSheet = XLSX.utils.json_to_sheet(result.grouping_data);
      XLSX.utils.book_append_sheet(workbook, groupingSheet, "Groupings");
      
      // 输出文件
      const wbout = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
      FileSaver.saveAs(new Blob([wbout], { type: "application/octet-stream" }), "volleyball_schedule.xlsx");
      navigate('/schedule-viewer', {
        state: {
          scheduleData: result.schedule_data,
          startDate: startDate
        }
      });
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "生成過程中發生錯誤，請檢查檔案格式是否正確。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stripe font-sans">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-xl border-4 border-yellow-400 relative z-10">
        <h1 className="text-3xl font-extrabold text-blue-900 text-center mb-6">🏐 台大盃排球賽程生成器</h1>

        <div className="mb-4">
          <label className="block text-blue-900 font-extrabold mb-2">📂 上傳分組檔案：</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleGroupFileUpload}
            className="w-full p-2 border-2 border-yellow-300 rounded-md bg-blue-50"
          />
        </div>

        <div className="mb-4">
          <label className="block text-blue-900 font-extrabold mb-2">📂 上傳可用性檔案：</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleAvailabilityFileUpload}
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
          {loading ? '生成中...' : '生成賽程'}
        </button>
      </div>
    </div>
  );
}

export default ScheduleGenerator; 