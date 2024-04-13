import { Schema, model } from 'mongoose';

const studentSchema = new Schema({
  scholarNumber: String,
  studentName: String,
  email: String,
  contactNumber: String,
});

const Student = model('Student', studentSchema);

export default Student;
