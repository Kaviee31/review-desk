import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AllZerothReviews = () => {
  const [allComments, setAllComments] = useState([]);

  useEffect(() => {
    axios.get('/api/zeroth-review/all').then((res) => {
      setAllComments(res.data);
    });
  }, []);

  return (
    <div className="p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4">All Zeroth Review Comments</h2>
      {allComments.map((item, idx) => (
        <div key={idx} className="border-b py-3">
          <p><strong>{item.studentName}</strong> ({item.registerNumber})</p>
          <p><em>{item.comment}</em></p>
          <small>Teacher: {item.teacherEmail} | {new Date(item.timestamp).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};

export default AllZerothReviews;
