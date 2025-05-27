const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const upload = multer({ dest: 'uploads/' });

// 静态文件服务
app.use(express.static('public'));
app.use(express.static('build'));

// 处理分组生成请求
app.post('/api/generate-groups', upload.single('file'), async (req, res) => {
  try {
    const pythonProcess = spawn('python', [
      'src/python/generate_groups.py',
      req.file.path
    ]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(errorData);
        return res.status(500).json({ error: errorData || '生成分組失敗' });
      }

      try {
        const lines = outputData.trim().split('\n');
        const jsonCandidates = lines.filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
      
        if (jsonCandidates.length === 0) {
          throw new Error("找不到合法 JSON 輸出");
        }
      
        const result = JSON.parse(jsonCandidates[jsonCandidates.length - 1]);
        res.json(result);
      } catch (error) {
        console.error('Failed to parse Python output:', error);
        res.status(500).json({ error: '解析結果失敗' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 处理赛程生成请求
app.post('/api/generate-schedule', upload.fields([
  { name: 'group_file', maxCount: 1 },
  { name: 'availability_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const pythonProcess = spawn('python', [
      'src/python/generate_schedule.py',
      req.files.group_file[0].path,
      req.files.availability_file[0].path
    ]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(errorData);
        return res.status(500).json({ error: errorData || '生成賽程失敗' });
      }

      try {
        const lines = outputData.trim().split('\n');
        // 找到最後一行以 { 開頭的
        const lastJsonLine = lines.reverse().find(line => line.trim().startsWith('{'));
        const result = JSON.parse(lastJsonLine);
        res.json(result);
      } catch (error) {
        console.error('Failed to parse Python output:', error);
        res.status(500).json({ error: '解析結果失敗' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

// 所有其他请求返回React应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 