import {Schema} from "mongoose";


const meetingSchema= new Schema({
    user_id:{type:String},
    meeting_code: {type:String, require:true, unique:true},
    date: {type:Date,default: Date.now ,require:true}
}) 

const Meeting= mongoose.model("meeting", meetingSchema);

export{Meeting};