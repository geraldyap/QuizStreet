require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const questions = require('./sample.json')

const bot = new Bot(process.env.BOT_TOKEN || '');
const store = {};

// TODOs - points scoring, options for quiz (no. of qns etc)
// check on timeout, might be stopping message recognition
async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const showHints = async (chat, question, answer, iterations) => {
    if (store[chat.id].quizStart && !store[chat.id].goNext) {
        if (iterations === 3) {  
            await bot.api.sendMessage(chat.id, `Nobody guessed. The correct answer was <b>${answer}</b>`, {parse_mode: "HTML"})
            store[chat.id].index += 1;
            runQuiz(chat);
            return;
        }
        console.log(iterations)
        const hint = '____';
        await bot.api.sendMessage(chat.id, `${question}\n<i>Hint:</i> ${hint}`, {parse_mode: "HTML"})
        await timeout(2000)
        await showHints(chat, question, answer, ++iterations);
    } else {
        store[chat.id].goNext = false;
        runQuiz(chat);
    }
}

const runQuiz = async (chat) => {
    const index = store[chat.id].index;
    const question = store[chat.id].questions.results[index - 1].question;
    const answer = store[chat.id].questions.results[index - 1].correct_answer;
    await bot.api.sendMessage(chat.id, `Question ${index}: \n${question}`, {parse_mode: "HTML"})
    await timeout(2000);
    await showHints(chat, question, answer, 0);
}

bot.command('start', async ctx => {
    console.log('ctx.msg', ctx.msg)
    await ctx.reply('Starting quiz now!')
    const chat = ctx.chat;
    store[chat.id] = {...chat, quizStart: true, questions, index: 1, goNext: false }
    // get list of questions and pass it here
    await runQuiz(chat, questions);
})

bot.command('stop', ctx => {
    console.log(`Stopping quiz in ${JSON.stringify(ctx.chat.title)}`)
    ctx.reply('Stopping the quiz')
    const chat = ctx.chat;
    store[chat.id] = {...chat, quizStart: false };
})

bot.command('help', ctx => {
    ctx.reply('Show list of help commands here: TODO')
})

bot.on("message", async (ctx) => {
    const chat = ctx.chat;
    if (!store[chat.id] || !store[chat.id].quizStart) return false;
    const index = store[chat.id].index;
    const answer = store[chat.id].questions.results[index - 1].correct_answer;
    console.log("🚀 ~ file: app.js ~ line 66 ~ bot.on ~ answer", answer);
    console.log(ctx.msg.text);
    if (answer === ctx.msg.text) {
        store[chat.id].index += 1;
        store[chat.id].goNext = true;
        if (store[chat.id][ctx.from.first_name]) {
            store[chat.id][ctx.from.first_name] += 1;
        } else {
            store[chat.id][ctx.from.first_name] = 1;
        }
        await bot.api.sendMessage(chat.id, `Yes, <b>${answer}</b>!\n${ctx.from.first_name} + 1`, {parse_mode: "HTML"})
    }
})

bot.start();
console.log("Started")