require('dotenv').config();
const { Bot } = require('grammy');
const { getQuestions } = require('./api.js');
const utils = require('./utils.js');
const fsPromise = require('fs/promises');
const fs = require('fs');
const bot = new Bot(process.env.BOT_TOKEN || '');
let store = {};
let timer = null;
const STORE_JSON = 'store.json';

// TODOs - points scoring, options for quiz (no. of qns etc)
// TODOS commands /next /help
// TODOs find somewhere to host the bot

const checkAndCreateStore = async () => {
    if (!fs.existsSync(STORE_JSON)) {
        await fsPromise.writeFile(STORE_JSON, JSON.stringify({}));
    } else {
        const storeJson = await fsPromise.readFile(STORE_JSON);
        store = JSON.parse(storeJson);
    }
}

const showHints = async (chat, question, answer, iteration, prevHint = {}) => {
    if (store[chat.id].quizStart && !store[chat.id].goNext) {
        if (iteration === 3) {  
            await bot.api.sendMessage(chat.id, `Nobody guessed. The correct answer was <b>${answer}</b>`, {parse_mode: "HTML"})
            store[chat.id].index += 1;
            await runQuiz(chat);
            return;
        }
        const newHint = utils.generateHint(answer, iteration, prevHint)
        await bot.api.sendMessage(chat.id, `${question}\n<i>Hint:</i> ${newHint.hint}`, {parse_mode: "HTML"})
        timer = utils.timeout(iteration < 2 ? 15000 : 20000);
        await timer.promise;
        await showHints(chat, question, answer, ++iteration, newHint);
    } else if (!store[chat.id].quizStart) {
        return;
    } else {
        store[chat.id].goNext = false;
        await runQuiz(chat);
        return;
    }
}

// TODO add more winners 🎖 
const runQuiz = async (chat) => {
    const index = store[chat.id].index;
    if (index > store[chat.id].questions.length) {
        await bot.api.sendMessage(chat.id, `🏁 <b>And the winners are:</b>\n 🏆 ${JSON.stringify(store[chat.id].points)}`, {parse_mode: "HTML"})
        store[chat.id] = {...chat, quizStart: false };
        timer = null;
        return;
    }
    const question = store[chat.id].questions[index - 1].question;
    const category = store[chat.id].questions[index - 1].category;
    let answer = store[chat.id].questions[index - 1].answer;
    answer = utils.trimAnswer(answer);
    store[chat.id].questions[index - 1].answer = answer;
    timer = utils.timeout(1000);
    await timer.promise;
    await bot.api.sendMessage(chat.id, `<b>Round</b> ${index}/10\n▶️ <b>QUESTION</b> <i>[${category || "nil"}]</i>: \n${question}`, {parse_mode: "HTML"})
    timer = utils.timeout(10000);
    await timer.promise;
    await showHints(chat, question, answer, 0);
    return;
}

bot.command('start', async ctx => {
    const chat = ctx.chat;
    if (store[chat.id] && store[chat.id].quizStart) {
        await ctx.reply("The quiz is already running right now!")
        return;
    }
    console.log('ctx.msg', ctx.msg)
    await ctx.reply('Starting quiz now!')
    const questions = await getQuestions();
    store[chat.id] = {...chat, quizStart: true, questions, index: 1, goNext: false, points: {} }
    runQuiz(chat); // cannot await, will block bot cycle
})

bot.command('stop', async ctx => {
    const chat = ctx.chat;
    if (store[chat.id] && !store[chat.id].quizStart) {
        await ctx.reply("The quiz is not running right now!")
        return;
    }
    store[chat.id] = {...chat, quizStart: false };
    timer.cancel();
    timer = null;
    console.log(`Stopping quiz in ${JSON.stringify(ctx.chat.title)}`)
    await ctx.reply('Stopping the quiz');
    return;
})

bot.command('help', async ctx => {
    await ctx.reply('Show list of help commands here: TODO')
})

bot.command('points', async ctx => {
    const chat = ctx.chat;
    const id = chat.id;
    const storeJson = await fsPromise.readFile(STORE_JSON);
    const parsed = JSON.parse(storeJson);
    if (parsed[id] && parsed[id].points) {
        const points = parsed[id].points;
        await ctx.reply('Showing the points leaderboard in the channel now:');
        await bot.api.sendMessage(id, `<b>${JSON.stringify(points)}</b>`, { parse_mode: "HTML" });
    } else {
        await ctx.reply('No points leaderboard to show, type /start to begin the quiz!')
    }
})

bot.on("message", async (ctx) => {
    try {
        const chat = ctx.chat;
        const id = chat.id;
        if (!store[id] || !store[id].quizStart || !ctx.msg.text) return false;
        const index = store[id].index;
        const answer = store[id].questions[index - 1].answer;
        console.log(`User: ${ctx.from.first_name}, Answer: ${ctx.msg.text}, Correct answer: ${answer}`);
        if (answer.toLowerCase() === ctx.msg.text.toLowerCase()) {
            store[id].index += 1;
            store[id].goNext = true;
            if (store[id].points[ctx.from.first_name]) {
                store[id].points[ctx.from.first_name] += 1;
            } else {
                store[id].points[ctx.from.first_name] = 1;
            }
            await bot.api.sendMessage(id, `✅ Yes, <b>${answer}</b>!\n\n🏅 ${ctx.from.first_name} +1 .... Jing Shi is a hacker`, {parse_mode: "HTML"})
            timer.cancel();
            timer = null;

            // save to store
            // const toSave = { id, title: store[id].title, type: store[id].type, quizStart: store[id].quizStart, points: store[id].points };
            const toSave = store[id];
            const storeJson = await fsPromise.readFile(STORE_JSON);
            let json = {};
            if (Object.keys(storeJson).length) {
                json = {...JSON.parse(storeJson)};
            }
            json[id] = toSave;
            await fsPromise.writeFile(STORE_JSON, JSON.stringify(json));
        }
    } catch (e) {
        console.error(e);
        ctx.reply("Error has occurred, pls contact Street.")
    }
})

bot.start();
checkAndCreateStore();
console.log("Started")
