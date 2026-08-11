const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// --- 1. سيرفر Express لمنصة Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Stark Financial System & Marvel Bot is Active!'));
app.listen(PORT, () => console.log(`🌐 سيرفر الويب شغال على المنفذ: ${PORT}`));

// --- 2. الاتصال بـ MongoDB ومخطط البيانات ---
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('🍃 تم الاتصال بنجاح بـ MongoDB'))
        .catch((err) => console.error('❌ خطأ في الاتصال بـ MongoDB:', err));
}

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    stocks: {
        stark: { type: Number, default: 0 },
        oscorp: { type: Number, default: 0 },
        pym: { type: Number, default: 0 }
    }
});

const User = mongoose.model('User', userSchema);

// أسعار أسهم شركات مارفل الافتراضية
let stockPrices = {
    stark: 150,
    oscorp: 80,
    pym: 120
};

// تحديث أسعار البورصة عشوائياً كل 30 دقيقة
setInterval(() => {
    stockPrices.stark = Math.max(10, Math.floor(stockPrices.stark + (Math.random() * 40 - 20)));
    stockPrices.oscorp = Math.max(10, Math.floor(stockPrices.oscorp + (Math.random() * 50 - 25)));
    stockPrices.pym = Math.max(10, Math.floor(stockPrices.pym + (Math.random() * 30 - 15)));
    console.log('📈 تم تحديث أسعار بورصة مارفل!', stockPrices);
}, 30 * 60 * 1000);

// صور وبانرات ثيم مارفل
const IMAGES = {
    HELP_BANNER: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?q=80&w=1000&auto=format&fit=crop',
    STARK_BANK: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1000&auto=format&fit=crop'
};

// --- 3. إعداد البوت ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = "!";

async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) user = await User.create({ userId });
    return user;
}

client.once('ready', () => console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // -------------------------------------------------------------
    // 📖 1. أمر المساعدة (!مساعدة / !help)
    // -------------------------------------------------------------
    if (command === 'مساعدة' || command === 'اوامر' || command === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#E62429')
            .setTitle('🛡️ دليل أوامر بوت مارفل والاقتصاد (Stark OS)')
            .setDescription('أهلاً بك يا بطل! إليك جميع الأوامر المتاحة في السيرفر:')
            .setImage(IMAGES.HELP_BANNER)
            .setThumbnail(message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
            .addFields(
                { 
                    name: '💸 **التحويل والمالية:**', 
                    value: '• `!تحويل @العضو المبلغ` : تحويل فايبراينيوم لأي عضو.\n• `!رصيدي` : عرض بطاقتك البنكية ومحفظتك.\n• `!راتب` : استلام المكافأة اليومية (1,500 🪙).\n• `!ايداع <المبلغ/الكل>` : إيداع الكاش في البنك لحمايته.\n• `!سحب <المبلغ/الكل>` : سحب الفايبراينيوم لكاش.' 
                },
                { 
                    name: '📈 **البورصة والاستثمار:**', 
                    value: '• `!أسهم` : عرض أسعار أسهم شركات مارفل الحالية.\n• `!شراء_أسهم <الشركة> <العدد>` : شراء أسهم (stark, oscorp, pym).\n• `!بيع_أسهم <الشركة> <العدد>` : بيع أسهمك وحصد الأرباح.' 
                },
                { 
                    name: '⚔️ **المهام والمعلومات:**', 
                    value: '• `!مهمة` : القيام بمهمة بطولية كل 30 دقيقة لكسب المال.\n• `!معلوماتي` : عرض بطاقة معلومات حسابك وتاريخ انضمامك.' 
                }
            )
            .setFooter({ text: 'Stark Industries • Powered by Jarvis', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // -------------------------------------------------------------
    // 💸 2. أمر التحويل للأشخاص (!تحويل @عضو المبلغ)
    // -------------------------------------------------------------
    if (command === 'تحويل' || command === 'pay' || command === 'transfer') {
        const target = message.mentions.members.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply('❌ **يرجى تحديد العضو!** مثال: `!تحويل @اسم_العضو 500`');
        if (target.id === message.author.id) return message.reply('⚠️ **لا يمكنك تحويل الفايبراينيوم لنفسك!**');
        if (target.user.bot) return message.reply('🤖 **لا يمكنك التحويل للبوتات!**');
        if (isNaN(amount) || amount <= 0) return message.reply('❌ **يرجى إدخال مبلغ صحيح!**');

        const senderData = await getUser(message.author.id);
        if (senderData.wallet < amount) return message.reply(`❌ **رصيدك الكاش لا يكفي!** معك حالياً **${senderData.wallet.toLocaleString()}** 🪙 فايبراينيوم.`);

        const receiverData = await getUser(target.id);

        const tax = Math.floor(amount * 0.01); // 1% ضريبة حماية
        const finalAmount = amount - tax;

        senderData.wallet -= amount;
        receiverData.wallet += finalAmount;

        await senderData.save();
        await receiverData.save();

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('💸 تمت عملية التحويل بنجاح!')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135706.png')
            .setDescription(`قام **${message.author.username}** بتحويل **${finalAmount.toLocaleString()}** 🪙 فايبراينيوم إلى **${target.user.username}**!`)
            .setFooter({ text: `خصم ضريبة حماية S.H.I.E.L.D (1%): ${tax} 🪙` })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // -------------------------------------------------------------
    // 💰 3. أمر بطاقة البنك بالصورة (!رصيدي)
    // -------------------------------------------------------------
    if (command === 'رصيدي' || command === 'bal' || command === 'balance') {
        const targetMember = message.mentions.members.first() || message.member;
        const userData = await getUser(targetMember.id);
        const total = userData.wallet + userData.bank;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle(`🏛️ بطاقة Stark البنكية — ${targetMember.user.username}`)
            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '💵 الكاش (Vibranium):', value: `**${userData.wallet.toLocaleString()}** 🪙`, inline: true },
                { name: '🏦 خزنة Stark Vault:', value: `**${userData.bank.toLocaleString()}** 🪙`, inline: true },
                { name: '💎 الإجمالي العام:', value: `**${total.toLocaleString()}** 🪙`, inline: false },
                { name: '📈 محفظة الأسهم (عدد):', value: `Stark: **${userData.stocks.stark}** | Oscorp: **${userData.stocks.oscorp}** | Pym: **${userData.stocks.pym}**`, inline: false }
            )
            .setImage(IMAGES.STARK_BANK)
            .setFooter({ text: 'Stark Financial Card Security', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // -------------------------------------------------------------
    // 📈 4. البورصة والأسهم (!أسهم / !شراء_أسهم / !بيع_أسهم)
    // -------------------------------------------------------------
    if (command === 'أسهم' || command === 'stocks') {
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📈 سوق أسهم شركات مارفل (Stark Stock Market)')
            .setDescription('الأسعار تتغير كل 30 دقيقة! اشترِ بسعر منخفض وبع بسعر مرتفع:')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2422/2422796.png')
            .addFields(
                { name: '🔴 Stark Industries (stark):', value: `السعر الحالي: **${stockPrices.stark}** 🪙`, inline: false },
                { name: '🟢 Oscorp Tech (oscorp):', value: `السعر الحالي: **${stockPrices.oscorp}** 🪙`, inline: false },
                { name: '🟡 Pym Technologies (pym):', value: `السعر الحالي: **${stockPrices.pym}** 🪙`, inline: false }
            )
            .setFooter({ text: 'الشراء: !شراء_أسهم stark 5 | البيع: !بيع_أسهم stark 2' });

        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'شراء_أسهم' || command === 'buy-stock') {
        const stockName = args[0]?.toLowerCase();
        const count = parseInt(args[1]);

        if (!['stark', 'oscorp', 'pym'].includes(stockName) || isNaN(count) || count <= 0) {
            return message.reply('❌ **طريقة خاطئة!**\nمثال: `!شراء_أسهم stark 5`');
        }

        const price = stockPrices[stockName] * count;
        const userData = await getUser(message.author.id);

        if (userData.wallet < price) {
            return message.reply(`❌ **لا تملك فايبراينيوم كافي!** التكلفة: **${price.toLocaleString()}** 🪙`);
        }

        userData.wallet -= price;
        userData.stocks[stockName] += count;
        await userData.save();

        return message.reply(`🎉 **تم شراء ${count} أسهم في شركة ${stockName.toUpperCase()} بنجاح بسعر ${price.toLocaleString()} 🪙!**`);
    }

    if (command === 'بيع_أسهم' || command === 'sell-stock') {
        const stockName = args[0]?.toLowerCase();
        const count = parseInt(args[1]);

        if (!['stark', 'oscorp', 'pym'].includes(stockName) || isNaN(count) || count <= 0) {
            return message.reply('❌ **طريقة خاطئة!**\nمثال: `!بيع_أسهم stark 2`');
        }

        const userData = await getUser(message.author.id);

        if (userData.stocks[stockName] < count) {
            return message.reply(`❌ **لا تملك هذا العدد من الأسهم في شركة ${stockName.toUpperCase()}!**`);
        }

        const revenue = stockPrices[stockName] * count;
        userData.stocks[stockName] -= count;
        userData.wallet += revenue;
        await userData.save();

        return message.reply(`💰 **تم بيع ${count} أسهم في ${stockName.toUpperCase()} وحصلت على ${revenue.toLocaleString()} 🪙 كاش!**`);
    }

    // -------------------------------------------------------------
    // ⚔️ 5. المهمة البطولية (!مهمة)
    // -------------------------------------------------------------
    if (command === 'مهمة' || command === 'work') {
        const userData = await getUser(message.author.id);
        const cooldown = 30 * 60 * 1000;

        if (userData.lastWork && (Date.now() - new Date(userData.lastWork).getTime()) < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - new Date(userData.lastWork).getTime())) / (1000 * 60));
            return message.reply(`⏳ أنت في استراحة بطولية! عد بعد **${remaining} دقيقة** لتأدية مهمة جديدة.`);
        }

        const missions = [
            "ساعدت Spiderman في إيقاف سرقة بنك!",
            "ساعدت Iron Man في تصنيع مفاعل جديد!",
            "شاركت مع Captain America في تأمين شحنة Vibranium!",
            "دحرت أتباع Thanos في ضواحي المدينة!"
        ];

        const randomMission = missions[Math.floor(Math.random() * missions.length)];
        const reward = Math.floor(Math.random() * 400) + 200;

        userData.wallet += reward;
        userData.lastWork = new Date();
        await userData.save();

        return message.reply(`🦸‍♂️ **${randomMission}**\nالمكافأة: **${reward}** 🪙 فايبراينيوم!`);
    }

    // -------------------------------------------------------------
    // 🎁 6. الراتب اليومي (!راتب)
    // -------------------------------------------------------------
    if (command === 'راتب' || command === 'daily') {
        const userData = await getUser(message.author.id);
        const cooldown = 24 * 60 * 60 * 1000;

        if (userData.lastDaily && (Date.now() - new Date(userData.lastDaily).getTime()) < cooldown) {
            return message.reply(`⏳ لقد استلمت الدعم اليومي بالفعل!`);
        }

        const reward = 1500;
        userData.wallet += reward;
        userData.lastDaily = new Date();
        await userData.save();

        return message.reply(`🎉 **تم استلام الدعم اليومي!** حصلت على **${reward}** 🪙 فايبراينيوم.`);
    }

    // -------------------------------------------------------------
    // 👤 7. أمر معلوماتي (!معلوماتي)
    // -------------------------------------------------------------
    if (command === 'معلوماتي') {
        const member = message.member;
        const user = message.author;

        const createdUnix = Math.floor(user.createdTimestamp / 1000);
        const joinedUnix = Math.floor(member.joinedTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('👤 معلومات الحساب — ' + user.username)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🗓️ تاريخ إنشاء الحساب:', value: `<t:${createdUnix}:F> (<t:${createdUnix}:R>)`, inline: false },
                { name: '📥 تاريخ الانضمام للسيرفر:', value: `<t:${joinedUnix}:F> (<t:${joinedUnix}:R>)`, inline: false }
            )
            .setFooter({ text: 'طلب بواسطة: ' + user.tag, iconURL: user.displayAvatarURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // -------------------------------------------------------------
    // 🏦 8. الإيداع والسحب (!ايداع / !سحب)
    // -------------------------------------------------------------
    if (command === 'ايداع' || command === 'dep') {
        const userData = await getUser(message.author.id);
        let amount = args[0] === 'الكل' || args[0] === 'all' ? userData.wallet : parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || userData.wallet < amount) return message.reply('❌ مبلغ غير صالح أو رصيدك الكاش لا يكفي!');

        userData.wallet -= amount;
        userData.bank += amount;
        await userData.save();
        return message.reply(`🏦 **تم إيداع ${amount.toLocaleString()} 🪙 في البنك بنجاح!**`);
    }

    if (command === 'سحب' || command === 'with') {
        const userData = await getUser(message.author.id);
        let amount = args[0] === 'الكل' || args[0] === 'all' ? userData.bank : parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || userData.bank < amount) return message.reply('❌ مبلغ غير صالح أو رصيدك بالبنك لا يكفي!');

        userData.bank -= amount;
        userData.wallet += amount;
        await userData.save();
        return message.reply(`🏧 **تم سحب ${amount.toLocaleString()} 🪙 إلى محفظتك كاش!**`);
    }
});

client.login(process.env.TOKEN);
