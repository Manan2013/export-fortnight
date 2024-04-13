import { Schema, model } from 'mongoose';

const surveySchema = new Schema({
    username: { type: String, required: true },
    diagnosis: { type: String, required: true }
});

const Survey = model('Survey', surveySchema);

export default Survey;
