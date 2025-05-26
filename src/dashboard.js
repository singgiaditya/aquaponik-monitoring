// src/Dashboard.js
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { io } from 'socket.io-client';

const API_URL = 'https://aquaponik-backend-production.up.railway.app/data';
const SOCKET_URL = 'https://aquaponik-backend-production.up.railway.app';
const TABLE_API_URL = 'https://aquaponik-backend-production.up.railway.app/data/all';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentStats, setCurrentStats] = useState({
    temperature: 0,
    humidity: 0,
    waterTemp: 0,
    ph: 0,
    tds: 0,
    waterDistance: 0,
    lightIntensity: 0
  });
  const [tableData, setTableData] = useState({
    data: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    sort: 'asc'
  });
  const [isLoading, setIsLoading] = useState(false);

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
        updateCurrentStats(formattedData[formattedData.length - 1]);
        checkNotification(formattedData);
        setLastUpdate(new Date().toLocaleString());
      } catch (err) {
        console.error('Gagal fetch data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('iot_data', (newItem) => {
      const formattedItem = {
        ...newItem,
        timestamp: new Date(newItem.created_at).toLocaleString(),
      };
      setData(prev => {
        const newData = [...prev, formattedItem];
        return newData;
      });
      updateCurrentStats(formattedItem);
      checkNotification([newItem]);
      setLastUpdate(new Date().toLocaleString());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchTableData = async (page = 1, limit = 10, sort = 'asc') => {
    setIsLoading(true);
    try {
      const response = await fetch(`${TABLE_API_URL}?page=${page}&limit=${limit}&sort=${sort}`);
      const json = await response.json();
      setTableData(json);
    } catch (err) {
      console.error('Gagal mengambil data tabel:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTableData();
  }, []);

  const updateCurrentStats = (current) => {
    if (!current) return;
    setCurrentStats({
      temperature: current.temperature,
      humidity: current.humidity,
      waterTemp: current.water_temperature,
      ph: current.ph || 0,
      tds: current.tds,
      waterDistance: current.water_distance,
      lightIntensity: current.light_intensity
    });
  };

  function checkNotification(items) {
    const latest = Array.isArray(items) ? items[items.length - 1] : items;
    if (!latest) return;
    
    const notifications = [];
    
    if (latest.water_distance > 15) {
      notifications.push({
        message: `Jarak air ${latest.water_distance}cm, direkomendasikan untuk menambah air`,
        action: 'Tambah Air',
        type: 'warning',
        onAction: () => alert('Aksi: Menambah air...')
      });
    }
    
    if (latest.ph && latest.ph < 6.5) {
      notifications.push({
        message: `pH rendah (${latest.ph}), tambahkan penstabil pH`,
        action: 'Tambah Penstabil pH',
        type: 'danger',
        onAction: () => alert('Aksi: Menambah penstabil pH...')
      });
    }
    
    if (latest.temperature > 30) {
      notifications.push({
        message: `Suhu udara tinggi (${latest.temperature}°C), aktifkan sistem pendingin`,
        action: 'Aktifkan Pendingin',
        type: 'warning',
        onAction: () => alert('Aksi: Mengaktifkan pendingin...')
      });
    }

    setNotification(notifications.length > 0 ? notifications[0] : null);
  }

  const getStatusColor = (value, type) => {
    switch (type) {
      case 'temperature':
        return value > 30 ? 'text-red-500' : value < 20 ? 'text-blue-500' : 'text-green-500';
      case 'humidity':
        return value > 80 ? 'text-red-500' : value < 40 ? 'text-yellow-500' : 'text-green-500';
      case 'ph':
        return value < 6.5 ? 'text-red-500' : value > 8.5 ? 'text-yellow-500' : 'text-green-500';
      default:
        return 'text-green-500';
    }
  };

  const handlePageChange = (newPage) => {
    fetchTableData(newPage, tableData.limit, tableData.sort);
  };

  const handleSortChange = (newSort) => {
    fetchTableData(1, tableData.limit, newSort);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Aquaponik Monitoring Dashboard</h1>
            <div className="text-sm text-gray-500">
              Update Terakhir: {lastUpdate}
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-gray-500 text-sm">Suhu Udara</div>
              <div className={`text-2xl font-bold ${getStatusColor(currentStats.temperature, 'temperature')}`}>
                {currentStats.temperature}°C
              </div>
              <div className="text-xs text-gray-400 mt-1">Normal: 20-30°C</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-gray-500 text-sm">Kelembapan</div>
              <div className={`text-2xl font-bold ${getStatusColor(currentStats.humidity, 'humidity')}`}>
                {currentStats.humidity}%
              </div>
              <div className="text-xs text-gray-400 mt-1">Normal: 40-80%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="text-gray-500 text-sm">Suhu Air</div>
              <div className={`text-2xl font-bold ${getStatusColor(currentStats.waterTemp, 'temperature')}`}>
                {currentStats.waterTemp}°C
              </div>
              <div className="text-xs text-gray-400 mt-1">Normal: 20-30°C</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="text-gray-500 text-sm">pH Air</div>
              <div className={`text-2xl font-bold ${getStatusColor(currentStats.ph, 'ph')}`}>
                {currentStats.ph}
              </div>
              <div className="text-xs text-gray-400 mt-1">Normal: 6.5-8.5</div>
            </div>
          </div>

          {/* Additional Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
              <div className="text-gray-500 text-sm">TDS</div>
              <div className="text-2xl font-bold text-indigo-600">
                {currentStats.tds} PPM
              </div>
              <div className="text-xs text-gray-400 mt-1">Total Dissolved Solids</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="text-gray-500 text-sm">Ketinggian Air</div>
              <div className={`text-2xl font-bold ${currentStats.waterDistance > 15 ? 'text-red-500' : 'text-green-500'}`}>
                {currentStats.waterDistance} cm
              </div>
              <div className="text-xs text-gray-400 mt-1">Optimal: {'<'} 15cm</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
              <div className="text-gray-500 text-sm">Intensitas Cahaya</div>
              <div className="text-2xl font-bold text-amber-600">
                {currentStats.lightIntensity} lux
              </div>
              <div className="text-xs text-gray-400 mt-1">Intensitas Pencahayaan</div>
            </div>
          </div>

          {/* Notifications */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg ${
              notification.type === 'danger' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className="flex items-center justify-between">
                <span>{notification.message}</span>
                <button 
                  onClick={notification.onAction}
                  className={`px-4 py-2 rounded-lg ml-4 text-white ${
                    notification.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {notification.action}
                </button>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Suhu dan Kelembapan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temperature" stroke="#8884d8" name="Suhu Udara" />
                  <Line type="monotone" dataKey="humidity" stroke="#82ca9d" name="Kelembapan" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Kondisi Air</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="water_temperature" stroke="#00bcd4" name="Suhu Air" />
                  <Line type="monotone" dataKey="water_distance" stroke="#FF5733" name="Jarak Air" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Kualitas Air</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tds" fill="#4caf50" name="TDS" />
                  <Bar dataKey="ph" fill="#e91e63" name="pH" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Intensitas Cahaya</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tick={{ angle: -45 }} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="light_intensity" stroke="#ffc107" name="Intensitas Cahaya" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Riwayat Data</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Halaman {tableData.page} dari {tableData.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange(tableData.sort === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <span>Sort</span>
                  <svg className={`w-4 h-4 transition-transform ${tableData.sort === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suhu Udara</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelembapan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suhu Air</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TDS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jarak Air</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cahaya</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center">Loading...</td>
                  </tr>
                ) : (
                  tableData.data.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(item.temperature, 'temperature')}`}>
                        {item.temperature}°C
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(item.humidity, 'humidity')}`}>
                        {item.humidity}%
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(item.water_temperature, 'temperature')}`}>
                        {item.water_temperature}°C
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(item.ph, 'ph')}`}>
                        {item.ph}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.tds} PPM
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.water_distance > 15 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.water_distance} cm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.light_intensity} lux
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center text-sm text-gray-500">
              Menampilkan {tableData.data.length} dari {tableData.total} data
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Ke halaman:</span>
                <input
                  type="number"
                  min="1"
                  max={tableData.totalPages}
                  value={tableData.page}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= tableData.totalPages) {
                      handlePageChange(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm border rounded-md"
                />
                <span className="text-sm text-gray-600">dari {tableData.totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={tableData.page === 1}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    tableData.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  «
                </button>
                <button
                  onClick={() => handlePageChange(tableData.page - 1)}
                  disabled={tableData.page === 1}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    tableData.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(tableData.page + 1)}
                  disabled={tableData.page === tableData.totalPages}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    tableData.page === tableData.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(tableData.totalPages)}
                  disabled={tableData.page === tableData.totalPages}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    tableData.page === tableData.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
