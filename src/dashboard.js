// src/Dashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  WiThermometer, 
  WiHumidity, 
  WiRaindrop 
} from "react-icons/wi";
import { 
  FaWater, 
  FaRegLightbulb,
  FaFlask,
  FaChartLine
} from "react-icons/fa";

const API_URL = 'https://aquaponik-backend-production.up.railway.app/data';
const SOCKET_URL = 'https://aquaponik-backend-production.up.railway.app';
const TABLE_API_URL = 'https://aquaponik-backend-production.up.railway.app/data/all';
const ACTIONS_API_URL = 'https://aquaponik-backend-production.up.railway.app/actions';

const SensorCard = ({ title, value, unit, icon: Icon, color, onClick, status }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-lg p-2.5 xs:p-4 sm:p-6 cursor-pointer transform transition-transform hover:scale-105 w-full"
  >
    <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
      <div className="flex items-center">
        <div className={`p-1.5 xs:p-2 sm:p-3 rounded-lg ${color.bg}`}>
          <Icon className={`w-3 h-3 xs:w-4 xs:h-4 sm:w-6 sm:h-6 ${color.text}`} />
        </div>
        <h3 className="ml-1.5 xs:ml-2 sm:ml-3 text-xs xs:text-sm sm:text-base text-gray-700 font-medium">{title}</h3>
      </div>
      <FaChartLine className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-gray-400" />
    </div>    <div className="flex items-end justify-between">
      <div>
        <span className={`text-lg xs:text-xl sm:text-3xl font-bold ${status.color}`}>
          {value}
        </span>
        <span className="ml-0.5 xs:ml-1 sm:ml-2 text-xs xs:text-sm sm:text-base text-gray-500">{unit}</span>
      </div>
      <span className={`px-1.5 xs:px-2 py-0.5 xs:py-1 text-[10px] xs:text-xs sm:text-sm rounded-full font-medium ${status.bg} ${status.color}`}>
        {status.text}
      </span>
    </div>
  </div>
);

const Dashboard = () => {

  const [notification, setNotification] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [actionsData, setActionsData] = useState({
    data: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    sort: 'desc'
  });
  const [lastFeedingTime, setLastFeedingTime] = useState(null);
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

  const updateCurrentStats = useCallback((current) => {
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
  }, []);

  const checkNotification = useCallback((items) => {
    const latest = Array.isArray(items) ? items[items.length - 1] : items;
    if (!latest) return;
    
    const notifications = [];
    
    // Check water level
    if (latest.water_distance > 15) {
      notifications.push({
        message: `Jarak air ${latest.water_distance}cm, direkomendasikan untuk menambah air`,
        action: 'Tambah Air',
        type: 'warning',
        onAction: () => {
          fetch(`${ACTIONS_API_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pump',
              action: 'increase_water',
              value: latest.water_distance - 15
            })
          });
        }
      });
    } else if (latest.water_distance < 5) {
      notifications.push({
        message: `Jarak air terlalu rendah (${latest.water_distance}cm), kurangi air`,
        action: 'Kurangi Air',
        type: 'warning',
        onAction: () => {
          fetch(`${ACTIONS_API_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pump',
              action: 'decrease_water',
              value: 5 - latest.water_distance
            })
          });
        }
      });
    }
    
    // Check pH level
    if (latest.ph && latest.ph < 6.5) {
      notifications.push({
        message: `pH rendah (${latest.ph}), tambahkan penstabil pH`,
        action: 'Tambah Penstabil pH',
        type: 'danger',
        onAction: () => alert('Aksi: Menambah penstabil pH...')
      });
    }
    
    // Check temperature
    if (latest.temperature > 30) {
      notifications.push({
        message: `Suhu udara tinggi (${latest.temperature}°C), aktifkan sistem pendingin`,
        action: 'Aktifkan Pendingin',
        type: 'warning',
        onAction: () => alert('Aksi: Mengaktifkan pendingin...')
      });
    }

    // Check feeding time
    if (lastFeedingTime) {
      const hoursSinceLastFeeding = (new Date() - new Date(lastFeedingTime)) / (1000 * 60 * 60);
      if (hoursSinceLastFeeding >= 8) {
        notifications.push({
          message: 'Sudah 8 jam sejak pemberian pakan terakhir',
          action: 'Beri Pakan',
          type: 'warning',
          onAction: () => {
            fetch(`${ACTIONS_API_URL}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'servo',
                action: 'push_food',
                value: 1
              })
            });
          }
        });
      }
    }    setNotification(notifications.length > 0 ? notifications[0] : null);
  }, [lastFeedingTime]); // Add lastFeedingTime as a dependency
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        if (json.length > 0) {
          const latestData = json[json.length - 1];
          updateCurrentStats(latestData);
          checkNotification(latestData);
          setLastUpdate(new Date().toLocaleString());
        }
      } catch (err) {
        console.error('Gagal fetch data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [updateCurrentStats, checkNotification]);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('iot_data', (newItem) => {      const formattedItem = {
        ...newItem,
        timestamp: new Date(newItem.created_at).toLocaleString(),
      };
      updateCurrentStats(formattedItem);
      checkNotification([newItem]);
      setLastUpdate(new Date().toLocaleString());
    });

    return () => {
      socket.disconnect();
    };
  }, [updateCurrentStats, checkNotification]);

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

  const fetchActionsData = async (page = 1, limit = 20, sort = 'desc') => {
    try {
      const response = await fetch(`${ACTIONS_API_URL}?page=${page}&limit=${limit}&sort=${sort}`);
      const json = await response.json();
      setActionsData(json);
      
      // Update last feeding time
      const lastFeeding = json.data.find(item => item.type === 'servo' && item.action === 'push_food');
      if (lastFeeding) {
        setLastFeedingTime(new Date(lastFeeding.created_at));
      }
    } catch (err) {
      console.error('Gagal mengambil data aksi:', err);
    }
  };

  useEffect(() => {
    fetchActionsData();
    const interval = setInterval(fetchActionsData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = (value, type) => {
    switch (type) {
      case 'temperature':
        return {
          color: value > 30 ? 'text-red-600' : value < 20 ? 'text-blue-600' : 'text-green-600',
          bg: value > 30 ? 'bg-red-100' : value < 20 ? 'bg-blue-100' : 'bg-green-100',
          text: value > 30 ? 'Tinggi' : value < 20 ? 'Rendah' : 'Normal'
        };
      case 'humidity':
        return {
          color: value > 80 ? 'text-red-600' : value < 40 ? 'text-yellow-600' : 'text-green-600',
          bg: value > 80 ? 'bg-red-100' : value < 40 ? 'bg-yellow-100' : 'bg-green-100',
          text: value > 80 ? 'Tinggi' : value < 40 ? 'Rendah' : 'Normal'
        };
      case 'ph':
        return {
          color: value < 6.5 ? 'text-red-600' : value > 8.5 ? 'text-yellow-600' : 'text-green-600',
          bg: value < 6.5 ? 'bg-red-100' : value > 8.5 ? 'bg-yellow-100' : 'bg-green-100',
          text: value < 6.5 ? 'Asam' : value > 8.5 ? 'Basa' : 'Normal'
        };
      case 'water_level':
        return {
          color: value > 15 ? 'text-red-600' : 'text-green-600',
          bg: value > 15 ? 'bg-red-100' : 'bg-green-100',
          text: value > 15 ? 'Tinggi' : 'Normal'
        };
      default:
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          text: 'Normal'
        };
    }
  };

  const getStatusColor = (value, type) => {
    const status = getStatusInfo(value, type);
    return status.color;
  };

  const handleSortChange = useCallback((newSort) => {
    fetchTableData(1, tableData.limit, newSort);
  }, [tableData.limit]);

  const handlePageChange = useCallback((newPage) => {
    fetchTableData(newPage, tableData.limit, tableData.sort);
  }, [tableData.limit, tableData.sort]);

  const handleActionsSortChange = useCallback((newSort) => {
    fetchActionsData(1, actionsData.limit, newSort);
  }, [actionsData.limit]);

  const handleActionsPageChange = useCallback((newPage) => {
    fetchActionsData(newPage, actionsData.limit, actionsData.sort);
  }, [actionsData.limit, actionsData.sort]);
  return (    <div className="min-h-screen bg-gray-100 p-0.5 xs:p-1 sm:p-2 md:p-4">
      <div className="w-full max-w-7xl mx-auto px-0.5 xs:px-1 sm:px-2">
        <div className="mb-2 xs:mb-3 sm:mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Aquaponik Monitoring Dashboard</h1>
            <div className="text-xs sm:text-sm text-gray-500">
              Update Terakhir: {lastUpdate}
            </div>
          </div>

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
          )}          {/* Sensor Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 -mx-0.5 xs:-mx-1 sm:mx-0">
            <Link to="/sensor/temperature" className="block px-0.5 xs:px-1 sm:px-0">
              <SensorCard
                title="Suhu Udara"
                value={currentStats.temperature}
                unit="°C"
                icon={WiThermometer}
                color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                status={getStatusInfo(currentStats.temperature, 'temperature')}
              />
            </Link>
            <Link to="/sensor/humidity" className="block">
              <SensorCard
                title="Kelembapan"
                value={currentStats.humidity}
                unit="%"
                icon={WiHumidity}
                color={{ bg: 'bg-green-100', text: 'text-green-600' }}
                status={getStatusInfo(currentStats.humidity, 'humidity')}
              />
            </Link>
            <Link to="/sensor/waterTemp" className="block">
              <SensorCard
                title="Suhu Air"
                value={currentStats.waterTemp}
                unit="°C"
                icon={WiThermometer}
                color={{ bg: 'bg-cyan-100', text: 'text-cyan-600' }}
                status={getStatusInfo(currentStats.waterTemp, 'temperature')}
              />
            </Link>
            <Link to="/sensor/ph" className="block">
              <SensorCard
                title="pH Air"
                value={currentStats.ph}
                unit=""
                icon={FaFlask}
                color={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
                status={getStatusInfo(currentStats.ph, 'ph')}
              />
            </Link>
            <Link to="/sensor/tds" className="block">
              <SensorCard
                title="TDS"
                value={currentStats.tds}
                unit="PPM"
                icon={FaWater}
                color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }}
                status={getStatusInfo(currentStats.tds, 'default')}
              />
            </Link>
            <Link to="/sensor/waterDistance" className="block">
              <SensorCard
                title="Ketinggian Air"
                value={currentStats.waterDistance}
                unit="cm"
                icon={WiRaindrop}
                color={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
                status={getStatusInfo(currentStats.waterDistance, 'water_level')}
              />
            </Link>
            <Link to="/sensor/lightIntensity" className="block">
              <SensorCard
                title="Intensitas Cahaya"
                value={currentStats.lightIntensity}
                unit="lux" 
                icon={FaRegLightbulb}
                color={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
                status={getStatusInfo(currentStats.lightIntensity, 'default')}
              />
            </Link>
          </div>
        </div>        {/* Data Table Section */}
        <div className="bg-white rounded-lg shadow-lg p-1.5 xs:p-2 sm:p-3 md:p-6 mt-2 xs:mt-3 sm:mt-4 md:mt-6 -mx-0.5 xs:-mx-1 sm:mx-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 xs:mb-3 space-y-1.5 xs:space-y-2 sm:space-y-0">
            <h2 className="text-base xs:text-lg sm:text-xl font-bold text-gray-800">Riwayat Data</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-sm text-gray-600 whitespace-nowrap">
                Halaman {tableData.page} dari {tableData.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange(tableData.sort === 'asc' ? 'desc' : 'asc')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <span>Sort</span>
                  <svg className={`w-4 h-4 transition-transform ${tableData.sort === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="-mx-3 sm:mx-0 overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Waktu</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Suhu Udara</th>
                  <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Kelembapan</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Suhu Air</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">pH</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TDS</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Jarak Air</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Cahaya</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan="8" className="px-3 sm:px-6 py-4 text-center text-sm">Loading...</td>
                      </tr>
                    ) : (
                      tableData.data.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${getStatusColor(item.temperature, 'temperature')}`}>
                            {item.temperature}°C
                          </td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${getStatusColor(item.humidity, 'humidity')}`}>
                            {item.humidity}%
                          </td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${getStatusColor(item.water_temperature, 'temperature')}`}>
                            {item.water_temperature}°C
                          </td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${getStatusColor(item.ph, 'ph')}`}>
                            {item.ph}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {item.tds} PPM
                          </td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${item.water_distance > 15 ? 'text-red-500' : 'text-green-500'}`}>
                            {item.water_distance} cm
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {item.light_intensity} lux
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 space-y-3 sm:space-y-0">
            <div className="flex items-center text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              Menampilkan {tableData.data.length} dari {tableData.total} data
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">Halaman:</span>
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
                  className="w-16 px-2 py-1 text-xs sm:text-sm border rounded-md"
                />
                <span className="text-xs sm:text-sm text-gray-600">dari {tableData.totalPages}</span>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={tableData.page === 1}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
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
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
                    tableData.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Prev
                </button>
                <button
                  onClick={() => handlePageChange(tableData.page + 1)}
                  disabled={tableData.page === tableData.totalPages}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
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
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
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
        </div>        {/* Actions History Table */}
        <div className="bg-white rounded-lg shadow-lg p-1.5 xs:p-2 sm:p-3 md:p-6 mt-2 xs:mt-3 sm:mt-4 md:mt-6 -mx-0.5 xs:-mx-1 sm:mx-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 xs:mb-3 space-y-1.5 xs:space-y-2 sm:space-y-0">
            <h2 className="text-base xs:text-lg sm:text-xl font-bold text-gray-800">Riwayat Aksi</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Halaman {actionsData.page} dari {actionsData.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleActionsSortChange(actionsData.sort === 'asc' ? 'desc' : 'asc')}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <span>Sort</span>
                  <svg className={`w-4 h-4 transition-transform ${actionsData.sort === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actionsData.data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                      {item.type === 'pump' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Pompa Air
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pemberi Pakan
                        </span>
                      )}
                    </td>                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.type === 'pump' ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                          item.action === 'increase_water' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-300'
                            : 'bg-orange-50 text-orange-700 border border-orange-300'
                        }`}>
                          {item.action === 'increase_water' ? '➕ Tambah Air' : '➖ Kurangi Air'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-300">
                          🔄 Beri Pakan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.type === 'pump' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-50 text-gray-700 border border-gray-300">
                          📏 {item.value} cm
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                          item.value === 1 
                            ? 'bg-green-50 text-green-700 border border-green-300'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                        }`}>
                          {item.value === 1 ? '🟢 Terbuka' : '🔴 Tertutup'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.type === 'pump' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Selesai
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.value === 1 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.value === 1 ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}              </tbody>
            </table>
          </div>

          {/* Actions Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center text-sm text-gray-500">
              Menampilkan {actionsData.data.length} dari {actionsData.total} aksi
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Ke halaman:</span>
                <input
                  type="number"
                  min="1"
                  max={actionsData.totalPages}
                  value={actionsData.page}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= actionsData.totalPages) {
                      handleActionsPageChange(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm border rounded-md"
                />
                <span className="text-sm text-gray-600">dari {actionsData.totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleActionsPageChange(1)}
                  disabled={actionsData.page === 1}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    actionsData.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  «
                </button>
                <button
                  onClick={() => handleActionsPageChange(actionsData.page - 1)}
                  disabled={actionsData.page === 1}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    actionsData.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleActionsPageChange(actionsData.page + 1)}
                  disabled={actionsData.page === actionsData.totalPages}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    actionsData.page === actionsData.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => handleActionsPageChange(actionsData.totalPages)}
                  disabled={actionsData.page === actionsData.totalPages}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    actionsData.page === actionsData.totalPages
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
