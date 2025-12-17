import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { saveWalletData, loadWalletData } from '../utils/wallet';
import { ethers } from 'ethers';

/**
 * 다중 서명 지갑 정책 관리 페이지
 * 금액별로 필요한 직급과 서명 수를 설정할 수 있습니다.
 */
const MultiSigPolicyPage = () => {
  const { address } = useParams();
  const { provider } = useWallet();
  
  const [policies, setPolicies] = useState([]); // 정책 목록
  const [roles, setRoles] = useState([]); // 직급 목록
  const [isLoading, setIsLoading] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null); // 편집 중인 정책 인덱스

  // 폼 상태
  const [formData, setFormData] = useState({
    minAmount: '',
    maxAmount: '',
    requiredRole: '',
    requiredSignatures: '1'
  });

  // 로컬 스토리지 키
  const policiesKey = `multisig_policies_${address?.toLowerCase()}`;
  const rolesKey = `multisig_roles_${address?.toLowerCase()}`;

  useEffect(() => {
    if (address) {
      loadData();
    }
  }, [address]);

  /**
   * 데이터 로드
   */
  const loadData = () => {
    try {
      setIsLoading(true);
      
      // 직급 목록 로드
      const savedRoles = loadWalletData(rolesKey) || [];
      setRoles(savedRoles);
      
      // 정책 목록 로드
      const savedPolicies = loadWalletData(policiesKey) || [];
      // 금액 순으로 정렬
      const sortedPolicies = savedPolicies.sort((a, b) => {
        const minA = parseFloat(a.minAmount) || 0;
        const minB = parseFloat(b.minAmount) || 0;
        return minA - minB;
      });
      setPolicies(sortedPolicies);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 폼 초기화
   */
  const resetForm = () => {
    setFormData({
      minAmount: '',
      maxAmount: '',
      requiredRole: '',
      requiredSignatures: '1'
    });
    setEditingPolicy(null);
  };

  /**
   * 정책 추가/수정 모달 열기
   */
  const handleOpenAddModal = (policyIndex = null) => {
    if (policyIndex !== null) {
      // 수정 모드
      const policy = policies[policyIndex];
      setFormData({
        minAmount: policy.minAmount.toString(),
        maxAmount: policy.maxAmount !== null ? policy.maxAmount.toString() : '',
        requiredRole: policy.requiredRole,
        requiredSignatures: policy.requiredSignatures.toString()
      });
      setEditingPolicy(policyIndex);
    } else {
      // 추가 모드
      resetForm();
    }
    setShowAddPolicyModal(true);
  };

  /**
   * 정책 저장 (추가/수정)
   */
  const handleSavePolicy = () => {
    // 유효성 검사
    const minAmount = parseFloat(formData.minAmount);
    const maxAmount = formData.maxAmount.trim() ? parseFloat(formData.maxAmount) : null;

    if (isNaN(minAmount) || minAmount < 0) {
      alert('유효한 최소 금액을 입력해주세요.');
      return;
    }

    if (maxAmount !== null && (isNaN(maxAmount) || maxAmount <= minAmount)) {
      alert('최대 금액은 최소 금액보다 커야 합니다.');
      return;
    }

    if (!formData.requiredRole) {
      alert('필수 직급을 선택해주세요.');
      return;
    }

    const requiredSignatures = parseInt(formData.requiredSignatures);
    if (isNaN(requiredSignatures) || requiredSignatures < 1) {
      alert('필수 서명 수는 1 이상이어야 합니다.');
      return;
    }

    // 금액 구간 중복 확인
    const newPolicy = {
      minAmount,
      maxAmount,
      requiredRole: formData.requiredRole,
      requiredSignatures
    };

    // 기존 정책과 구간이 겹치는지 확인
    const hasOverlap = policies.some((policy, index) => {
      if (editingPolicy === index) return false; // 현재 편집 중인 정책은 제외
      
      const policyMin = policy.minAmount;
      const policyMax = policy.maxAmount !== null ? policy.maxAmount : Infinity;
      const newMin = newPolicy.minAmount;
      const newMax = newPolicy.maxAmount !== null ? newPolicy.maxAmount : Infinity;

      // 구간이 겹치는지 확인
      return (newMin < policyMax && newMax > policyMin);
    });

    if (hasOverlap) {
      alert('금액 구간이 기존 정책과 겹칩니다. 다른 구간을 설정해주세요.');
      return;
    }

    // 정책 추가 또는 수정
    let updatedPolicies;
    if (editingPolicy !== null) {
      // 수정
      updatedPolicies = [...policies];
      updatedPolicies[editingPolicy] = newPolicy;
    } else {
      // 추가
      updatedPolicies = [...policies, newPolicy];
    }

    // 금액 순으로 정렬
    updatedPolicies.sort((a, b) => {
      const minA = parseFloat(a.minAmount) || 0;
      const minB = parseFloat(b.minAmount) || 0;
      return minA - minB;
    });

    setPolicies(updatedPolicies);
    saveWalletData(policiesKey, updatedPolicies);
    
    resetForm();
    setShowAddPolicyModal(false);
  };

  /**
   * 정책 삭제
   */
  const handleDeletePolicy = (index) => {
    if (!confirm('이 정책을 삭제하시겠습니까?')) {
      return;
    }

    const updatedPolicies = policies.filter((_, i) => i !== index);
    setPolicies(updatedPolicies);
    saveWalletData(policiesKey, updatedPolicies);
  };

  /**
   * 금액에 해당하는 정책 찾기
   */
  const getPolicyForAmount = (amount) => {
    return policies.find(policy => {
      const min = policy.minAmount;
      const max = policy.maxAmount !== null ? policy.maxAmount : Infinity;
      return amount >= min && amount < max;
    });
  };

  /**
   * 금액 포맷팅
   */
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '무제한';
    return `${parseFloat(amount).toFixed(6)} ETH`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">정책 관리</h1>
        <p className="text-gray-600">금액별로 필요한 직급과 서명 수를 설정합니다.</p>
      </div>

      {/* 안내 메시지 */}
      {roles.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-800 font-medium">직급이 없습니다.</p>
              <p className="text-sm text-yellow-700 mt-1">
                정책을 설정하기 전에 먼저 직급을 생성해주세요. <a href={`/multisig/${address}/roles`} className="underline">직급 관리로 이동</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 정책 목록 카드 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">정책 목록</h2>
          <button
            onClick={() => handleOpenAddModal()}
            disabled={roles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            + 정책 추가
          </button>
        </div>

        {policies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>등록된 정책이 없습니다. 정책을 추가해주세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">금액 범위:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatAmount(policy.minAmount)} ~ {formatAmount(policy.maxAmount)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">필수 직급:</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {policy.requiredRole}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">필수 서명:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {policy.requiredSignatures}명
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenAddModal(index)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="정책 수정"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeletePolicy(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="정책 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 정책 테스트 카드 */}
      {policies.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">정책 테스트</h2>
          <PolicyTester policies={policies} />
        </div>
      )}

      {/* 정책 추가/수정 모달 */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPolicy !== null ? '정책 수정' : '새 정책 추가'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최소 금액 (ETH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최대 금액 (ETH) <span className="text-gray-500">(비워두면 무제한)</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  placeholder="무제한"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필수 직급 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.requiredRole}
                  onChange={(e) => setFormData({ ...formData, requiredRole: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">직급 선택</option>
                  {roles.map((role, index) => (
                    <option key={index} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필수 서명 수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.requiredSignatures}
                  onChange={(e) => setFormData({ ...formData, requiredSignatures: e.target.value })}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  해당 직급을 가진 멤버 중 몇 명의 서명이 필요한지 설정합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddPolicyModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={!formData.minAmount || !formData.requiredRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingPolicy !== null ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 정책 테스터 컴포넌트
 */
const PolicyTester = ({ policies }) => {
  const [testAmount, setTestAmount] = useState('');
  const [testResult, setTestResult] = useState(null);

  const handleTest = () => {
    const amount = parseFloat(testAmount);
    if (isNaN(amount) || amount < 0) {
      alert('유효한 금액을 입력해주세요.');
      return;
    }

    const policy = policies.find(p => {
      const min = p.minAmount;
      const max = p.maxAmount !== null ? p.maxAmount : Infinity;
      return amount >= min && amount < max;
    });

    if (policy) {
      setTestResult({
        amount,
        policy,
        found: true
      });
    } else {
      setTestResult({
        amount,
        policy: null,
        found: false
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="number"
          step="0.000001"
          min="0"
          value={testAmount}
          onChange={(e) => setTestAmount(e.target.value)}
          placeholder="테스트할 금액 (ETH)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleTest()}
        />
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          테스트
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg ${
          testResult.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {testResult.found ? (
            <div>
              <p className="text-sm font-medium text-green-800 mb-2">
                {testResult.amount} ETH에 해당하는 정책을 찾았습니다.
              </p>
              <div className="text-sm text-green-700 space-y-1">
                <p>• 필수 직급: <span className="font-semibold">{testResult.policy.requiredRole}</span></p>
                <p>• 필수 서명: <span className="font-semibold">{testResult.policy.requiredSignatures}명</span></p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-800">
              {testResult.amount} ETH에 해당하는 정책이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSigPolicyPage;

