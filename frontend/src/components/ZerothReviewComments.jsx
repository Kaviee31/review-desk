import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ZerothReviewComments = ({ studentId }) => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    axios.get(`/api/zeroth-review/student/${studentId}`).then((res) => {
      setComments(res.data);
    });
  }, [studentId]);

  return (
    <div className="bg-gray-100 p-4 rounded-xl">
      <h2 className="text-xl font-bold mb-2">Zeroth Review Comments</h2>
      {comments.map((c, i) => (
        <div key={i} className="mb-3 p-2 border-l-4 border-blue-500 bg-white shadow rounded">
          <p><strong>Teacher:</strong> {c.teacherEmail}</p>
          <p className="text-gray-700">{c.comment}</p>
          <small className="text-sm text-gray-400">{new Date(c.timestamp).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};

export default ZerothReviewComments;
