const aiService = require('../services/aiService');

const askAssistant = async (req, res, next) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Question or prompt is required' });
    }

    const result = await aiService.askAssistant(prompt, history, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  askAssistant,
};
