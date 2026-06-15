const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AQ.Ab8RN6IkNFrX6QFsTc0lh4uER4qtzIa-kIqrsRCWDdsOXaYBhw');
    const data = await response.json();
    const validModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini'));
    console.log(validModels.map(m => m.name).slice(0, 10));
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
