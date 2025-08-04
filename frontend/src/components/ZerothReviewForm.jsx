import React, { useState } from 'react';
import axios from 'axios';

const ZerothReviewForm = ({ student }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/zeroth-review/add', {
      studentId: student.id,
      studentName: student.name,
      registerNumber: student.registerNumber,
      teacherEmail: student.teacherEmail, // assume you have this
      comment,
    });
    alert('Comment saved!');
    setComment('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded-xl mb-4">
      <h3 className="text-lg font-semibold">{student.name}</h3>
      <textarea
        className="w-full border p-2 rounded mt-2"
        placeholder="Enter comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-1 rounded">
        Submit Comment
      </button>
    </form>
  );
};

export default ZerothReviewForm;
