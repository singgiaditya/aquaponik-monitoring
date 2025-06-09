import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = 'https://aquaponik-backend-production.up.railway.app/data';

const SENSOR_INFO = {
  temperature: {
    title: 'Suhu Udara',
    unit: '°C',
    color: 'rgb(59, 130, 246)',
    borderColor: 'rgba(59, 130, 246, 0.5)'
  },
  humidity: {
    title: 'Kelembapan',
    unit: '%',
    color: 'rgb(34, 197, 94)',
    borderColor: 'rgba(34, 197, 94, 0.5)'
  },
  waterTemp: {
    title: 'Suhu Air',
    unit: '°C',
    color: 'rgb(6, 182, 212)',
    borderColor: 'rgba(6, 182, 212, 0.5)'
  },
  ph: {
    title: 'pH Air',
    unit: '',
    color: 'rgb(147, 51, 234)',
    borderColor: 'rgba(147, 51, 234, 0.5)'
  },
  tds: {
    title: 'TDS',
    unit: 'PPM',
    color: 'rgb(79, 70, 229)',
    borderColor: 'rgba(79, 70, 229, 0.5)'
  },
  waterDistance: {
    title: 'Ketinggian Air',
    unit: 'cm',
    color: 'rgb(249, 115, 22)',
    borderColor: 'rgba(249, 115, 22, 0.5)'
  },
  lightIntensity: {
    title: 'Intensitas Cahaya',
    unit: 'lux',
    color: 'rgb(245, 158, 11)',
    borderColor: 'rgba(245, 158, 11, 0.5)'
  }
};

const SensorDetail = () => {
  const { sensorType } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableData, setTableData] = useState({
    data: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    sort: 'desc'
  });

  const sensorInfo = SENSOR_INFO[sensorType];
  // Helper function to get sensor value
  const getSensorValue = useCallback((item) => {
    switch (sensorType) {
      case 'waterTemp':
        return item.water_temperature;
      case 'waterDistance':
        return item.water_distance;
      case 'lightIntensity':
        return item.light_intensity;
      default:
        return item[sensorType];
    }
  }, [sensorType]);

  useEffect(() => {
    if (!sensorInfo) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const json = await response.json();
        const formattedData = json.slice(-10).map(item => ({
          timestamp: new Date(item.created_at).toLocaleString(),
          value: getSensorValue(item)
        }));
        setData(formattedData);
        setTableData(prevState => ({
          ...prevState,
          data: json.slice(0, 10),
          total: json.length,
          totalPages: Math.ceil(json.length / 10)
        }));
      } catch (err) {
        console.error('Gagal fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sensorType, navigate, sensorInfo, getSensorValue]);

  const chartData = {
    labels: data.map(item => item.timestamp),
    datasets: [
      {
        label: sensorInfo?.title,
        data: data.map(item => item.value),
        fill: true,
        borderColor: sensorInfo?.color,
        backgroundColor: sensorInfo?.borderColor,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${sensorInfo?.title} - 10 Data Terakhir`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: sensorInfo?.unit
        }
      }
    }
  };

  const handlePageChange = useCallback(async (newPage) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?page=${newPage}&limit=${tableData.limit}&sort=${tableData.sort}`);
      const json = await response.json();
      setTableData(json);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableData.limit, tableData.sort]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Detail {sensorInfo?.title}
          </h1>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Riwayat Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nilai
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.data.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sensorType === 'waterTemp' ? item.water_temperature :
                       sensorType === 'waterDistance' ? item.water_distance :
                       sensorType === 'lightIntensity' ? item.light_intensity :
                       item[sensorType]}
                      {sensorInfo?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center text-sm text-gray-500">
              Menampilkan {tableData.data.length} dari {tableData.total} data
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorDetail;
