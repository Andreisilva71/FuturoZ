const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDc_y8BwxEPg0DSOmB2P8644x5TAOLZYFw');
    const data = await response.json();
    const validModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini'));
    console.log(validModels.map(m => m.name).slice(0, 10));
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
