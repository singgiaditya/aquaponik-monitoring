// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { io } from 'socket.io-client';

const API_URL = 'https://aquaponik-backend-production.up.railway.app/data'; // Ganti sesuai endpoint API backend Anda
const SOCKET_URL = 'https://aquaponik-backend-production.up.railway.app';   // Ganti sesuai endpoint Socket.IO backend Anda

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [notification, setNotification] = useState(null);

  // Ambil data awal dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        const formattedData = json.map(item => ({
          temperature: item.temperature,
          humidity: item.humidity,
          water_distance: item.water_distance,
          water_temperature: item.water_temperature,
          light_intensity: item.light_intensity,
          tds: item.tds,
          ph: item.ph,
          timestamp: new Date(item.created_at).toLocaleString(),
        }));
        setData(formattedData);
        checkNotification(formattedData);
      } catch (err) {
        console.error('Gagal fetch data:', err);
      }
    };
    fetchData();
  }, []);

  // Realtime update via Socket.IO
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('iot_data', (newItem) => {
      const formattedItem = {
        ...newItem,
        timestamp: new Date(newItem.created_at).toLocaleString(),
      };
      setData(prev => [...prev, formattedItem]);
      checkNotification([newItem]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Cek kondisi untuk notifikasi
  function checkNotification(items) {
    const latest = Array.isArray(items) ? items[items.length - 1] : items;
    if (!latest) return;
    if (latest.water_distance > 15) {
      setNotification({
        message: `Jarak air ${latest.water_distance}cm, direkomendasikan untuk menambah air`,
        action: 'Tambah Air',
        onAction: () => alert('Aksi: Menambah air...'),
      });
    } else if (latest.ph && latest.ph < 6.5) {
      setNotification({
        message: `pH rendah (${latest.ph}), tambahkan penstabil pH`,
        action: 'Tambah Penstabil pH',
        onAction: () => alert('Aksi: Menambah penstabil pH...'),
      });
    } else {
      setNotification(null);
    }
  }

  return (
    <div>
      <h1>Web Monitoring Dashboard</h1>

      {notification && (
        <div style={{ background: '#ffeeba', padding: 16, marginBottom: 16, borderRadius: 8, color: '#856404' }}>
          <span>{notification.message}</span>
          <button style={{ marginLeft: 16 }} onClick={notification.onAction}>{notification.action}</button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Suhu Udara" />
          <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Kelembapan" />
          <Line type="monotone" dataKey="water_distance" stroke="#FF5733" name="Jarak Air" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="water_temperature" stroke="#00bcd4" name="Suhu Air" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="light_intensity" fill="#ffc107" name="Intensitas Cahaya" />
          <Bar dataKey="tds" fill="#4caf50" name="TDS" />
          <Bar dataKey="ph" fill="#e91e63" name="pH" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard;
