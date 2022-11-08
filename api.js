require('dotenv').config();
const axios = require('axios');

const getQuestions = async () => {
    const response = await axios.request({
        method: 'GET',
        url: 'https://api.api-ninjas.com/v1/trivia?limit=10',
        headers: {
          'X-Api-Key': process.env.API_KEY
        },
      })
    console.log(response.data);
    return response.data;
}

module.exports = {
    getQuestions
}