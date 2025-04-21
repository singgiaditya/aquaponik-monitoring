// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import supabase from './supabaseClient';

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('iot_data')
        .select('temperature, humidity, created_at')
        .order('created_at', { ascending: true });

        if (error) {
          console.error(error);
        } else {
          console.log("Data dari Supabase:", data);
  
          
          const formattedData = data.map(item => {
            const formattedTimestamp = new Date(item.created_at).toLocaleString();
  
            return {
              temperature: item.temperature,
              humidity: item.humidity,
              timestamp: formattedTimestamp,
            };
          });
  
          setData(formattedData);
        }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Web Monitoring Dashboard</h1>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end"  />
          <YAxis />
          <Tooltip labelStyle={{color:"#000"}} />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
          <Line type="monotone" dataKey="humidity" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard;
