import React, { useState, useEffect, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore";

import "../styles/ChatWindow.css";

function ChatWindow({ currentUser, contactUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true); // loading state
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !contactUser) return;

    const chatKey = currentUser < contactUser
      ? `${currentUser}_${contactUser}`
      : `${contactUser}_${currentUser}`;

    const messagesRef = collection(db, "chats", chatKey, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    setLoadingMessages(true); // start loading

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
      setLoadingMessages(false); // done loading

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [currentUser, contactUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const chatKey = currentUser < contactUser
      ? `${currentUser}_${contactUser}`
      : `${contactUser}_${currentUser}`;

    const messagesRef = collection(db, "chats", chatKey, "messages");
    await addDoc(messagesRef, {
      senderId: currentUser,
      receiverId: contactUser,
      message: newMessage,
      timestamp: new Date(),
    });

    setNewMessage("");
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h4>{contactUser}</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="chat-body">
        {loadingMessages ? (
          <div className="chat-loading-spinner">
            <ClipLoader color="#36d7b7" size={30} />
            <p>Loading messages...</p>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.senderId === currentUser ? "sent" : "received"}`}
            >
              {msg.message}
            </div>
          ))
        ) : (
          <p className="no-messages-text">No messages yet. Start the conversation!</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;
