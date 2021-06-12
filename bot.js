const { Telegraf} = require('telegraf');
const bot = new Telegraf('YOUR TOKEN');
const FS = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');
const dbToken = 'YOUR DB TOKEN(MONGO)';
const Admins = require('./models/admins');
const Users = require('./models/users');
const express = require('express');
const herokuPass = express();
const PORT = process.env.PORT || 3000; //for heroku!

bot.use(Telegraf.session({ttl:5000}));
herokuPass.get('/',(req,res)=>{
   console.log('Heroku passed!');
   res.send('Hello Heroku!');
});



// bot.on('text',ctx=>{
//    ctx.reply('Проводяться техніні роботи зачекайте будь-ласка');
// });

// bot.on('callback_query',ctx=>{
//    ctx.reply('Проводяться техніні роботи зачекайте будь-ласка');
//    ctx.reply('Роблю адмінку');
// });

let fullFileHandler = {};
let fileType = '';
const clearSessionVariables = (ctx)=>{  
   ctx.session.botShow = false;
   ctx.session.botShowAdmin = false;
   ctx.session.botAddAdmin = false;
   ctx.session.botDeleteAdmin = false;
}

const defaultMenu = [
   [{text:"Найчacтіші запитання",callback_data:"QUESTIONS"}],
   [{text:"Розклади вступних випробовуваннь",callback_data:"SESSION"}],
   [{text:"Приймальна комісія",callback_data:"PRIYM"}],
   [{text:"Підтримка",callback_data:'SUPPORT'}],
   [{text:"Сайт коледжу",url:'https://www.college.uzhnu.edu.ua/'}]
];
const adminMenu = [...defaultMenu,[{text:"Меню Адміна",callback_data:"ADMIN_MENU"}]];



//BOT START
bot.start(async ctx=>{
   const user = await Users.findById({_id:ctx.from.id.toString()});
   if(user == null){

      new Users({
         username:ctx.from.username,
         first_name:ctx.from.first_name,
         last_name:ctx.from.last_name,
         _id:ctx.from.id.toString()
      }).save()

      console.log('!NEW USER!');

   }


   const res =  await Admins.findById({_id:ctx.from.id.toString()});
   if(res == null){
         await ctx.reply("Вітаю " + ctx.from.first_name);
            bot.telegram.sendMessage(ctx.chat.id,'Введіть /help для огляду доступних команд');
            clearSessionVariables(ctx);
         return;
      }

      bot.telegram.sendMessage(ctx.chat.id,"Вітаю,один із Admins",{
         reply_markup:{
            inline_keyboard:[
               [{text:"Тест бота(користувач)",callback_data:"Menu"}],
               [{text:"Редагування файлів",callback_data:"ADMIN_FILES"}],
               [{text:"Додавання та видалення адмінів",callback_data:'ADD/DELETE_ADMIN'}]
            ]
         }})
         clearSessionVariables(ctx);
         ctx.session.isAdmin = true;
         console.log('!ADMIN LOGGED!');
      
   })



bot.help(ctx=>{
   ctx.deleteMessage();
   if(ctx.session.isAdmin){
      bot.telegram.sendChatAction(ctx.chat.id,'typing');
      bot.telegram.sendMessage(ctx.chat.id,'Оберіть що саме вам потрібно:',{
         reply_markup:{
            inline_keyboard:adminMenu
         }
      });
      clearSessionVariables(ctx);
      return;
   }

   bot.telegram.sendChatAction(ctx.chat.id,'typing');
      bot.telegram.sendMessage(ctx.chat.id,'Оберіть що саме вам потрібно:',{
         reply_markup:{
            inline_keyboard:defaultMenu
         }
      });
      clearSessionVariables(ctx);

});


bot.action('QUESTIONS',ctx=>{
   ctx.deleteMessage();
   ctx.answerCbQuery();
   console.log(ctx.from.username);
   console.log(ctx.from.first_name);
   bot.telegram.sendChatAction(ctx.chat.id,'typing');
   bot.telegram.sendMessage(ctx.chat.id,"Що хочете дізнатись:",{
      reply_markup:{
         inline_keyboard:[
            [{text:"Які документи потрібно та екзамени?",callback_data:'Documents'}],
            [{text:"Які є спеціальності?",callback_data:'spiciality'}],
            [{text:"Програми та критерії?",callback_data:'criter'}],
            [{text:"Меню",callback_data:'Menu'}]
         ]
      }
   })
   clearSessionVariables(ctx);
})

bot.action('SUPPORT',async ctx=>{
   ctx.deleteMessage();
   ctx.answerCbQuery();
   bot.telegram.sendChatAction(ctx.chat.id,'typing');
   await bot.telegram.sendContact(ctx.chat.id,'+380964587399',"Valeriy")
      
      bot.telegram.sendMessage(ctx.chat.id,'Повернутись у меню:',{
         reply_markup:{
            inline_keyboard:[
               [{text:"Меню",callback_data:"Menu"}],
            ]
         }
      });
      clearSessionVariables(ctx);
});

bot.action('SESSION',ctx=>{
   ctx.deleteMessage();
   ctx.answerCbQuery();
   ctx.reply('Розклад скоро появиться').then(ctx=>{

      bot.telegram.sendMessage(ctx.chat.id,'Повернутись у меню:',{
         reply_markup:{
            inline_keyboard:[
               [{text:"Меню",callback_data:"Menu"}]
            ]
         }
      })

   });
   clearSessionVariables(ctx);
});


bot.on('document',async ctx=>{
   if(!ctx.session.isAdmin){
      return;
   }
   fileType = ctx.update.message.document.mime_type.slice(-3);
   if(fileType == 'pdf' || fileType == 'doc'){
   
    
   const url = await bot.telegram.getFileLink(ctx.update.message.document.file_id);
   const file = await axios({url:url,responseType:'arraybuffer'});
   fullFileHandler = file;

   const keyboard = [[{text:'Menu',callback_data:'ADMIN_MENU'}]];

   FS.readdir('./files',(err,filesNames)=>{
      const filtredFiles = filesNames.filter(file=> file.slice(-3) == fileType); //прибрати считування
      filtredFiles.forEach(fileName=>{
         keyboard.unshift([{text:`${fileName}`,callback_data:`${fileName}_ADMIN`}]);
      })

      bot.telegram.sendMessage(ctx.chat.id,'Оберіть файл для заміни:',{
         reply_markup:{
            inline_keyboard:keyboard
         }
      });
      
   })
}
clearSessionVariables(ctx);
});

      



bot.action('Documents',ctx=>{
   ctx.deleteMessage();
   ctx.answerCbQuery();
   bot.telegram.sendChatAction(ctx.chat.id,'typing');
   ctx.replyWithHTML(`<strong>При собі потрібно мати:</strong>
   -електронний екземпляр заповненої заяви (Додаток 1)
   -документа про повну загальну середню освіту і додаток до нього
   -документ, що посвідчує особу (ID-картка)
   -фотокартки для документів`).then(ctx =>{

      bot.telegram.sendMessage(ctx.chat.id,'Оберіть що потрібно:',{
         reply_markup:{
            inline_keyboard:[
               [{text:"Додаток1",callback_data:'Doc1'},{text:"Вступні іспити",callback_data:"Doc2"}],
               [{text:"Меню",callback_data:"Menu"}]
            ]
         }
      })
   });
   
   clearSessionVariables(ctx);
})

bot.action("Doc1",ctx=>{
   ctx.answerCbQuery();
   bot.telegram.sendChatAction(ctx.chat.id,'upload_document');
   bot.telegram.sendDocument(ctx.chat.id,{
      source:"files/Doc1Додаток1.doc"
   },{
      disable_notification:true
   });
   clearSessionVariables(ctx);
});

bot.action("Doc2",ctx=>{
   ctx.answerCbQuery();
   bot.telegram.sendChatAction(ctx.chat.id,'upload_document');
   bot.telegram.sendDocument(ctx.chat.id,{
      source:"files/Doc2Вступні2021.pdf"
   },{
      disable_notification:true
   });
   clearSessionVariables(ctx);
});

bot.action("Menu",ctx=>{
   ctx.deleteMessage();
   ctx.answerCbQuery();
   
   if(ctx.session.isAdmin){
      bot.telegram.sendChatAction(ctx.chat.id,'typing');
      bot.telegram.sendMessage(ctx.chat.id,'Оберіть що саме вам потрібно:',{
         reply_markup:{
            inline_keyboard:adminMenu
         }
      });
      clearSessionVariables(ctx);
      return;
   }
   
   bot.telegram.sendChatAction(ctx.chat.id,'typing');
   bot.telegram.sendMessage(ctx.chat.id,'Оберіть що саме вам потрібно:',{
      reply_markup:{
            inline_keyboard:defaultMenu
         }
      });
      clearSessionVariables(ctx);
   });
   
   bot.action("spiciality",async ctx=>{
      ctx.deleteMessage();
      ctx.answerCbQuery();
   bot.telegram.sendChatAction(ctx.chat.id,'upload_document');
   await bot.telegram.sendDocument(ctx.chat.id,{source:'files/Doc3Спеціальності.pdf'})

   bot.telegram.sendMessage(ctx.chat.id,'Повернутись у меню:',{
            reply_markup:{
               inline_keyboard:[
                  [{text:"Меню",callback_data:"Menu"}]
               ]
            }
         })
         clearSessionVariables(ctx);
   });
      

bot.action('criter',ctx=>{
   ctx.answerCbQuery();
   ctx.deleteMessage();
   bot.telegram.sendChatAction(ctx.chat.id,'typing');
   bot.telegram.sendMessage(ctx.chat.id,'Оберіть:',{
      reply_markup:{
         inline_keyboard:[
            [{text:"Історія",callback_data:'His'}],
            [{text:"Географія",callback_data:'Geo'}],
            [{text:"Математика",callback_data:'Math'}],
            [{text:"Українська мова",callback_data:'Ua'}],
            [{text:"Фізика",callback_data:'Phy'}],
            [{text:"Меню",callback_data:"Menu"}]
         ]
      }
   })
   clearSessionVariables(ctx);
   
});



bot.action("PRIYM",ctx=>{
   ctx.answerCbQuery();
   ctx.deleteMessage();
   bot.telegram.sendChatAction(ctx.chat.id,"typing");
   bot.telegram.sendMessage(ctx.chat.id,'Оберіть:',{
      reply_markup:{
         inline_keyboard:[
            [{text:"Графік роботи",callback_data:'GRAPHIC_PRIYM'}],
            [{text:"Телефон",callback_data:'PHONE_PRIYM'}],
            [{text:"Меню",callback_data:"Menu"}]
         ]
      }
   })
   clearSessionVariables(ctx);
   
});


bot.action("GRAPHIC_PRIYM",ctx=>{
   ctx.answerCbQuery();
   ctx.replyWithHTML(`<strong>Графік:</strong>
   -Понеділок
   -Вівторок
   -Середа
   -Четвер
   -П'ятниця
   -Субота(вихідний)
   -Неділя(вихідний)`);
   clearSessionVariables();
});

bot.action("PHONE_PRIYM",ctx=>{
   ctx.answerCbQuery();
   ctx.reply('(0312) 61-33-45');
   clearSessionVariables(ctx);
});

bot.action('ADMIN_MENU',ctx=>{
   ctx.answerCbQuery();
   ctx.deleteMessage();
   bot.telegram.sendMessage(ctx.chat.id,"Вітаю,один із Admins",{
      reply_markup:{
         inline_keyboard:[
            [{text:"Тест бота(користувач)",callback_data:"Menu"}],
            [{text:"Редагування файлів",callback_data:"ADMIN_FILES"}],
            [{text:"Додавання та видалення адмінів",callback_data:'ADD/DELETE_ADMIN'}]
         ]
      }
   });
   clearSessionVariables(ctx);
});


bot.action('ADMIN_FILES',ctx=>{
   ctx.answerCbQuery();
   ctx.deleteMessage();
   ctx.reply('Надішліть файл для заміни(doc/pdf):');
   clearSessionVariables(ctx);
});

bot.action('ADD/DELETE_ADMIN',ctx=>{
   ctx.answerCbQuery();
   ctx.deleteMessage();
   bot.telegram.sendMessage(ctx.chat.id,"Оберіть, що саме ви хочете зробити:",{
      reply_markup:{
         inline_keyboard:[
            [{text:"Вивести дані",callback_data:"SHOW"}],
            [{text:"Додати",callback_data:"ADD_ADMIN"}],
            [{text:"Видалити",callback_data:"DELETE_ADMIN"}],
            [{text:"Меню",callback_data:"ADMIN_MENU"}],
         ]
      }
   });
   clearSessionVariables(ctx);
});




bot.on('text',async(ctx,next)=>{
   console.log(ctx.message.text);
   if(!ctx.session.botShowAdmin){
      next();
      return;
   }
   const admins = await Admins.find({first_name:ctx.message.text.trim()});
   if(admins == null){
      clearSessionVariables(ctx);
      bot.telegram.sendMessage(ctx.chat.id,"Адміна з таким іменем не знайдено",{
         reply_markup:{
            inline_keyboard:[
               [{text:"Спробувати ще раз",callback_data:"SHOW_ADMIN"}],
               [{text:"Назад",callback_data:"SHOW"}],
            ]
         }
      });
      return;
   }
   const counter = admins.length;
   await ctx.reply(`Було знайдено ${counter} коритсувача(ів) з іменем ${ctx.message.text.trim()}`)
   for(admin of admins){
      ctx.reply(`First name: ${admin.first_name} \nLast name: ${admin.last_name} \nID: ${Number(admin._id)}`);
   }
   clearSessionVariables(ctx);
   return;

})





bot.on('text',async(ctx,next)=>{
   if(!ctx.session.botShow){
      next();
      return;
   }
   const users = await Users.find({first_name:ctx.message.text.trim()});
   if(users == null){
      ctx.answerCbQuery();
      bot.telegram.sendMessage(ctx.chat.id,"Користувача з таким іменем не знайдено",{
         reply_markup:{
            inline_keyboard:[
               [{text:"Спробувати ще раз",callback_data:"SHOW_USER"}],
               [{text:"Назад",callback_data:"SHOW"}],
            ]
         }
      });
      return;
   }
   const counter = users.length;
   await ctx.reply(`Було знайдено ${counter} коритсувача(ів) з іменем ${ctx.message.text.trim()}`)
   for(user of users){
     await ctx.reply(`First name: ${user.first_name} \nLast name: ${user.last_name} \nID:${Number(user._id)}`);
   }
   clearSessionVariables(ctx);
   return
})



bot.on('text', async(ctx,next)=>{
   console.log(ctx.message.text.trim());
   if(Number(ctx.message.text.trim()) == NaN || !ctx.session.botAddAdmin){
      next();
      return;
   };
   const user = await Users.findById({_id:ctx.message.text.trim()});
   if(user == null){
      ctx.reply(`Не знайдено користувача з Id ${ctx.message.text.trim()}`);
      clearSessionVariables(ctx);
      return;
   }
   const adminCheck = await Admins.findById({_id:ctx.message.text.trim()});
   if(adminCheck != null){
      ctx.reply('Користувач вже являється адміном!');
      clearSessionVariables(ctx);
      return;
   }
   await new Admins({
      username:user.username,
      first_name:user.first_name,
      last_name:user.last_name,
      _id:user._id
   }).save();
   clearSessionVariables(ctx);;
   ctx.reply('Користувачa додано як адміна!');
   return

});


bot.on('text', async(ctx,next)=>{
   console.log(ctx.message.text.trim());
   if(Number(ctx.message.text.trim()) == NaN || !ctx.session.botDeleteAdmin){
      next();
      return;
   };
   const admin = await Admins.findByIdAndDelete({_id:ctx.message.text.trim()});
   console.log(admin);
   if(admin == null){
      ctx.reply('Немає адміністратора з таким id!'); // написати про повтор дії
      clearSessionVariables(ctx);
      return;
   }
   ctx.reply('Адміністратора успішно видалено!');

});




bot.on('callback_query',async (ctx,next)=>{
if(ctx.callbackQuery.data == "SHOW"){
   ctx.answerCbQuery();
   ctx.deleteMessage();
   clearSessionVariables(ctx);
   bot.telegram.sendMessage(ctx.chat.id,"Оберіть, чиї данні переглянути:",{
      reply_markup:{
         inline_keyboard:[
            [{text:"Адмін",callback_data:"SHOW_ADMIN"}],
            [{text:"Користувач",callback_data:"SHOW_USER"}],
            [{text:"Назад",callback_data:"ADD/DELETE_ADMIN"}],
         ]
      }  
   });

}else if(ctx.callbackQuery.data == 'ADD_ADMIN'){
   ctx.answerCbQuery();
   await ctx.replyWithVideo({source:'./files/instruction.MP4'});
   ctx.reply("Id зможете знайти в пункті 'Вивести дані'\nВнесіть Id користувача:");
   ctx.session.botAddAdmin = true;

}else if(ctx.callbackQuery.data == 'DELETE_ADMIN'){
   ctx.answerCbQuery();
   await ctx.replyWithVideo({source:'./files/instruction.MP4'});
   ctx.reply("Id зможете знайти в пункті 'Вивести дані'\nВнесіть Id користувача:");
   ctx.session.botDeleteAdmin = true;
   
}else if(ctx.callbackQuery.data == 'SHOW_ADMIN'){
   ctx.answerCbQuery();
   ctx.reply("Внесіть ім'я адміністратора:");
   ctx.session.botShowAdmin = true;

}else if(ctx.callbackQuery.data == 'SHOW_USER'){
   ctx.answerCbQuery();
   ctx.reply("Внесіть ім'я користувача:");
   ctx.session.botShow = true;
   
}else{
   console.log('next');
   next();
}

});



bot.on('callback_query',(ctx,next)=>{
   let fileName = null;
   if(ctx.callbackQuery.data == 'UA.pdf_ADMIN'){
      fileName = 'UA.pdf';
      
   }else if(ctx.callbackQuery.data == 'PHY.pdf_ADMIN'){
      fileName = 'PHY.pdf';
      
   }else if(ctx.callbackQuery.data == 'MATH.pdf_ADMIN'){       ///CHANGE ON REGEX
      fileName = 'MATH.pdf';

   }else if(ctx.callbackQuery.data == 'HIST.pdf_ADMIN'){
      fileName = 'HIST.pdf';

   }else if(ctx.callbackQuery.data == 'GEO.pdf_ADMIN'){
      fileName = 'GEO.pdf';
      
   }else if(ctx.callbackQuery.data == 'Doc3Спеціальність.pdf_ADMIN'){
      fileName = 'Doc3Спеціальність.pdf';
      
   }else if(ctx.callbackQuery.data == 'Doc2Вступні2021.pdf_ADMIN'){
      fileName = 'Doc2Вступні2021.pdf';
   
   }else if(ctx.callbackQuery.data == 'Doc1Додаток1.doc_ADMIN'){
      fileName = 'Doc1Додаток1.doc';
   
   }else{
      next();
      return
   }

   if(fileName !== null && fileName.slice(-3) == fileType){
      FS.writeFile(`./files/${fileName}`,fullFileHandler.data,'binary',(err)=>{
         if(err){
            console.log(err);
            fileName = null;
         }
         clearSessionVariables(ctx);
      });
      ctx.deleteMessage();
      ctx.answerCbQuery();
      ctx.reply('Файл перезаписано');
      bot.telegram.sendMessage(ctx.chat.id,'Повернутись у меню:',{
         reply_markup:{
            inline_keyboard:[
               [{text:"Меню",callback_data:'ADMIN_MENU'}]
            ]
         }
      });
   }else{
      clearSessionVariables(ctx);
      console.log('Not this type bruh');
      ctx.reply('Не правильний тип файлу');
      ctx.answerCbQuery();
      return
   }

   
  
});

bot.on("callback_query",ctx=>{
   ctx.answerCbQuery();
   clearSessionVariables(ctx);
   bot.telegram.sendChatAction(ctx.chat.id,'upload_document');
   if(ctx.callbackQuery.data == "His"){
      
      bot.telegram.sendDocument(ctx.chat.id,{
         source:'files/HIST.pdf'
      })
      
   }else if(ctx.callbackQuery.data == "Geo"){

      bot.telegram.sendDocument(ctx.chat.id,{
         source:'files/GEO.pdf'
      })
      
   }else if(ctx.callbackQuery.data == "Math"){
      
      bot.telegram.sendDocument(ctx.chat.id,{
         source:'files/MATH.pdf'
      })
      
   }else if(ctx.callbackQuery.data == "Ua"){

      bot.telegram.sendDocument(ctx.chat.id,{
         source:'files/UA.pdf'
      }).then()
      
   }else if(ctx.callbackQuery.data == "Phy"){

      bot.telegram.sendDocument(ctx.chat.id,{
         source:'files/PHY.pdf'
         
      })
   }
})

const runServer = async ()=>{
   try{
   await mongoose.connect(dbToken,{useNewUrlParser: true,useUnifiedTopology: true });}
   catch(err){
      console.log('Connection error!');
   }
   herokuPass.listen(PORT);
   bot.launch();
}

runServer();
