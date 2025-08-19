'use client'

import { useState } from 'react'
import axios from 'axios'

export default function Home() {
  const [count, setCount] = useState(0)

  const handleApiTest = async () => {
    try {
      // 예시 API 호출 (실제 API 엔드포인트로 변경 필요)
      const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1')
      console.log('API Response:', response.data)
      alert('API 호출 성공! 콘솔을 확인하세요.')
    } catch (error) {
      console.error('API Error:', error)
      alert('API 호출 실패! 콘솔을 확인하세요.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Frontend App
          </h1>
          <p className="text-xl text-gray-600">
            Next.js + Tailwind CSS + Axios
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              카운터 테스트
            </h2>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-4">
                {count}
              </div>
              <div className="space-x-4">
                <button
                  onClick={() => setCount(count + 1)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                >
                  증가
                </button>
                <button
                  onClick={() => setCount(count - 1)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                >
                  감소
                </button>
                <button
                  onClick={() => setCount(0)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  리셋
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              API 테스트
            </h2>
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Axios를 사용한 API 호출 테스트
              </p>
              <button
                onClick={handleApiTest}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded transition-colors"
              >
                API 호출 테스트
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            프로젝트 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700">기술 스택:</h3>
              <ul className="list-disc list-inside text-gray-600 mt-2">
                <li>Next.js 14 (App Router)</li>
                <li>React 18</li>
                <li>Tailwind CSS</li>
                <li>Axios</li>
                <li>TurboPack (개발용)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">개발 명령어:</h3>
              <ul className="list-disc list-inside text-gray-600 mt-2">
                <li><code className="bg-gray-100 px-1 rounded">npm run dev</code> - 개발 서버 시작</li>
                <li><code className="bg-gray-100 px-1 rounded">npm run build</code> - 프로덕션 빌드</li>
                <li><code className="bg-gray-100 px-1 rounded">npm run start</code> - 프로덕션 서버 시작</li>
                <li><code className="bg-gray-100 px-1 rounded">npm run lint</code> - 코드 검사</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
