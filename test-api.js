// Simple test script for the Nigerian University Assignment Helper API
// Run this after starting the server to test the endpoints

const fs = require('fs').promises;
const path = require('path');
const API_BASE_URL = 'http://localhost:3000/api';

// Create output directory if it doesn't exist
async function ensureOutputDir() {
  const outputDir = path.join(__dirname, 'test-output');
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir);
  }
  return outputDir;
}

// Save JSON response to file
async function saveJsonResponse(data, filename, outputDir) {
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved JSON response to: ${filePath}`);
}

// Save file response to disk
async function saveFileResponse(buffer, filename, outputDir) {
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, buffer);
  console.log(`💾 Saved file to: ${filePath}`);
}

async function pollJobStatus(jobId, outputDir) {
  const statusUrl = `${API_BASE_URL}/jobs/${jobId}`;
  let lastProgress = -1;
  while (true) {
    const res = await fetch(statusUrl);
    const data = await res.json();
    if (!data.success) {
      console.log('❌ Job failed or not found:', data.error);
      return null;
    }
    if (data.status === 'completed') {
      console.log('✅ Job completed!');
      return data.result;
    }
    if (data.status === 'failed') {
      console.log('❌ Job failed:', data.error);
      return null;
    }
    if (typeof data.progress === 'number' && data.progress !== lastProgress) {
      console.log(`⏳ Progress: ${data.progress}%`);
      lastProgress = data.progress;
    }
    await new Promise(r => setTimeout(r, 3000)); // Poll every 3s
  }
}

async function testAPI() {
  console.log('🧪 Testing Nigerian University Assignment Helper API...\n');

  try {
    const outputDir = await ensureOutputDir();

    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    await saveJsonResponse(healthData, 'health-check.json', outputDir);
    console.log('');

    // Test 2: API Info
    console.log('2. Testing API Info...');
    const infoResponse = await fetch(`${API_BASE_URL}/info`);
    const infoData = await infoResponse.json();
    console.log('✅ API Info:', infoData);
    await saveJsonResponse(infoData, 'api-info.json', outputDir);
    console.log('');

    // Test 3: Generate Assignment JSON Response
    console.log('3. Testing Assignment Generation (JSON)...');
    const assignmentData = {
      name: "NWAFOR SALOME KACHI",
      matric: "22/15CA175",
      department: "HISTORY AND INTERNATIONAL STUDIES",
      courseCode: "HIS301",
      courseTitle: "INTERNATIONAL POLITICAL SYSTEM",
      lecturerInCharge: "PROFESSOR ADEBAYO",
      numberOfPages: 3,
      question: "What major political or cultural kingdoms existed in East and Central Africa around 1800 AD, and what roles did they play in regional affairs?",
      fileType: "pdf"
    };

    // Save the request data
    await saveJsonResponse(assignmentData, 'assignment-request.json', outputDir);

    const jsonResponse = await fetch(`${API_BASE_URL}/assignments/generate-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData)
    });

    const jsonResult = await jsonResponse.json();
    
    if (jsonResult.success) {
      console.log('✅ Assignment Generated Successfully (JSON)!');
      console.log(`📄 Pages: ${jsonResult.data.pages}`);
      console.log(`📝 Word Count: ${jsonResult.data.wordCount}`);
      console.log(`⏰ Timestamp: ${jsonResult.data.timestamp}`);
      const expectedWordCount = assignmentData.numberOfPages * 500;
      console.log(`🔢 Expected Word Count: ${expectedWordCount}`);
      console.log(`🔢 Actual Word Count: ${jsonResult.data.wordCount}`);
      if (jsonResult.data.wordCount < expectedWordCount) {
        console.log('⚠️  Actual word count is less than expected!');
      }
      console.log('\n📖 Assignment Preview (first 200 characters):');
      console.log(jsonResult.data.assignment.substring(0, 200) + '...');
      
      // Save the JSON response
      await saveJsonResponse(jsonResult, 'assignment-json-response.json', outputDir);
      
      // Save the assignment content as a separate text file
      await saveFileResponse(
        Buffer.from(jsonResult.data.assignment, 'utf8'),
        'assignment-content.txt',
        outputDir
      );
    } else {
      console.log('❌ Assignment Generation Failed (JSON):', jsonResult.error);
      await saveJsonResponse(jsonResult, 'assignment-error.json', outputDir);
      if (jsonResult.error.includes('GEMINI_API_KEY')) {
        console.log('💡 Make sure to set your GEMINI_API_KEY in the .env file');
      }
    }

    console.log('');

    // Test 4: Generate Assignment File Download
    console.log('4. Testing Assignment Generation (File Download)...');
    const fileResponse = await fetch(`${API_BASE_URL}/assignments/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData)
    });
    if (fileResponse.status === 202) {
      // Async job, poll for result
      const { jobId } = await fileResponse.json();
      console.log(`🆔 Job started. jobId: ${jobId}`);
      const result = await pollJobStatus(jobId, outputDir);
      if (result) {
        const fileName = result.fileName || 'assignment.txt';
        const buffer = Buffer.from(result.buffer, 'base64');
        console.log('✅ Assignment File Generated Successfully (Async)!');
        console.log(`📁 File Name: ${fileName}`);
        console.log(`📏 File Size: ${buffer.length} bytes`);
        console.log(`📄 Content Type: ${result.mimeType}`);
        
        // Display word count and expansion information if available
        if (result.finalWordCount && result.targetWordCount) {
          console.log(`📝 Final Word Count: ${result.finalWordCount}`);
          console.log(`🎯 Target Word Count: ${result.targetWordCount}`);
          console.log(`📊 Word Count Ratio: ${((result.finalWordCount / result.targetWordCount) * 100).toFixed(1)}%`);
          if (result.expansionsUsed !== undefined) {
            console.log(`🔄 Expansions Used: ${result.expansionsUsed}`);
          }
          
          if (result.finalWordCount < result.targetWordCount * 0.9) {
            console.log('⚠️  Word count is significantly below target (less than 90%)');
          } else if (result.finalWordCount >= result.targetWordCount) {
            console.log('🎉 Word count meets or exceeds target!');
          } else {
            console.log('✅ Word count is close to target (90%+)');
          }
        }
        
        await saveFileResponse(buffer, fileName, outputDir);
      }
    } else if (fileResponse.ok) {
      // Immediate file download
      const fileName = fileResponse.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'assignment.txt';
      const fileBuffer = await fileResponse.arrayBuffer();
      console.log('✅ Assignment File Generated Successfully!');
      console.log(`📁 File Name: ${fileName}`);
      console.log(`📏 File Size: ${fileBuffer.byteLength} bytes`);
      console.log(`📄 Content Type: ${fileResponse.headers.get('content-type')}`);
      await saveFileResponse(Buffer.from(fileBuffer), fileName, outputDir);
      if (fileName.endsWith('.txt')) {
        const textContent = new TextDecoder().decode(fileBuffer);
        console.log('\n📖 File Preview (first 300 characters):');
        console.log(textContent.substring(0, 300) + '...');
      }
    } else {
      const errorData = await fileResponse.json();
      console.log('❌ Assignment File Generation Failed:', errorData.error);
      await saveJsonResponse(errorData, 'file-generation-error.json', outputDir);
    }

    console.log('');

    // Test 5: Generate Long Assignment (10 pages) to test section splitting and expansion
    console.log('5. Testing Long Assignment Generation (10 pages)...');
    const longAssignmentData = {
      name: "NWAFOR SALOME KACHI",
      matric: "22/15CA175",
      department: "HISTORY AND INTERNATIONAL STUDIES",
      courseCode: "HIS401",
      courseTitle: "ADVANCED INTERNATIONAL RELATIONS",
      lecturerInCharge: "PROFESSOR ADEBAYO",
      numberOfPages: 5,
      question: "Analyze the impact of colonialism on the political, economic, and social development of African nations in the 20th century. Discuss the long-term consequences and how they continue to influence contemporary African politics and international relations.",
      fileType: "pdf"
    };

    // Save the long assignment request data
    await saveJsonResponse(longAssignmentData, 'long-assignment-request.json', outputDir);

    const longFileResponse = await fetch(`${API_BASE_URL}/assignments/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(longAssignmentData)
    });
    
    if (longFileResponse.status === 202) {
      // Async job, poll for result
      const { jobId } = await longFileResponse.json();
      console.log(`🆔 Long assignment job started. jobId: ${jobId}`);
      const longResult = await pollJobStatus(jobId, outputDir);
      if (longResult) {
        const longFileName = longResult.fileName || 'long-assignment.txt';
        const longBuffer = Buffer.from(longResult.buffer, 'base64');
        console.log('✅ Long Assignment File Generated Successfully (Async)!');
        console.log(`📁 File Name: ${longFileName}`);
        console.log(`📏 File Size: ${longBuffer.length} bytes`);
        console.log(`📄 Content Type: ${longResult.mimeType}`);
        
        // Display word count and expansion information
        if (longResult.finalWordCount && longResult.targetWordCount) {
          console.log(`📝 Final Word Count: ${longResult.finalWordCount}`);
          console.log(`🎯 Target Word Count: ${longResult.targetWordCount}`);
          console.log(`📊 Word Count Ratio: ${((longResult.finalWordCount / longResult.targetWordCount) * 100).toFixed(1)}%`);
          if (longResult.expansionsUsed !== undefined) {
            console.log(`🔄 Expansions Used: ${longResult.expansionsUsed}`);
          }
          
          if (longResult.finalWordCount < longResult.targetWordCount * 0.9) {
            console.log('⚠️  Word count is significantly below target (less than 90%)');
          } else if (longResult.finalWordCount >= longResult.targetWordCount) {
            console.log('🎉 Word count meets or exceeds target!');
          } else {
            console.log('✅ Word count is close to target (90%+)');
          }
        }
        
        await saveFileResponse(longBuffer, longFileName, outputDir);
      }
    } else {
      const longErrorData = await longFileResponse.json();
      console.log('❌ Long Assignment File Generation Failed:', longErrorData.error);
      await saveJsonResponse(longErrorData, 'long-file-generation-error.json', outputDir);
    }

    console.log('');

    // Test 6: Generate a simple short assignment to test PDF formatting
    console.log('6. Testing Simple Assignment Generation (1 page)...');
    const simpleAssignmentData = {
      name: "TEST STUDENT",
      matric: "TEST123",
      department: "TEST DEPARTMENT",
      courseCode: "TEST101",
      courseTitle: "TEST COURSE",
      lecturerInCharge: "TEST LECTURER",
      numberOfPages: 1,
      question: "What is the importance of education in society?",
      fileType: "pdf"
    };

    const simpleResponse = await fetch(`${API_BASE_URL}/assignments/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleAssignmentData)
    });
    
    if (simpleResponse.ok) {
      const fileName = simpleResponse.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'simple-assignment.pdf';
      const fileBuffer = await simpleResponse.arrayBuffer();
      console.log('✅ Simple Assignment File Generated Successfully!');
      console.log(`📁 File Name: ${fileName}`);
      console.log(`📏 File Size: ${fileBuffer.byteLength} bytes`);
      console.log(`📄 Content Type: ${simpleResponse.headers.get('content-type')}`);
      await saveFileResponse(Buffer.from(fileBuffer), fileName, outputDir);
    } else {
      const errorData = await simpleResponse.json();
      console.log('❌ Simple Assignment File Generation Failed:', errorData.error);
    }

    console.log('\n🎉 All tests completed! Check the "test-output" folder for saved responses.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running on http://localhost:3000');
    
    // Save error information
    try {
      const outputDir = await ensureOutputDir();
      await saveJsonResponse({
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack
      }, 'test-error.json', outputDir);
    } catch (saveError) {
      console.error('Failed to save error:', saveError.message);
    }
  }
}

// Run the test
testAPI(); 