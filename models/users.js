const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  username: {type: String },
  first_name: { type: String },
  last_name: { type: String },
  _id: { type: String },
});

module.exports = mongoose.model('Users',schema);