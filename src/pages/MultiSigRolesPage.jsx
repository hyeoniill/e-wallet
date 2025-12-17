import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { getOwners } from '../utils/multisig';
import { saveWalletData, loadWalletData } from '../utils/wallet';

/**
 * 다중 서명 지갑 직급 관리 페이지
 */
const MultiSigRolesPage = () => {
  const { address } = useParams();
  const { provider, currentWallet } = useWallet();
  
  const [owners, setOwners] = useState([]);
  const [roles, setRoles] = useState([]); // 직급 목록 (예: ['관리자', '멤버', '게스트'])
  const [roleAssignments, setRoleAssignments] = useState({}); // 주소별 직급 배정 { address: role }
  const [newRoleName, setNewRoleName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  // 로컬 스토리지 키
  const rolesKey = `multisig_roles_${address?.toLowerCase()}`;
  const assignmentsKey = `multisig_role_assignments_${address?.toLowerCase()}`;

  useEffect(() => {
    if (address && provider) {
      loadData();
    }
  }, [address, provider]);

  /**
   * 데이터 로드
   */
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 소유자 목록 로드
      if (provider && address) {
        const ownersList = await getOwners(address, provider);
        setOwners(ownersList);
      }
      
      // 직급 목록 로드
      const savedRoles = loadWalletData(rolesKey) || [];
      setRoles(savedRoles);
      
      // 직급 배정 로드
      const savedAssignments = loadWalletData(assignmentsKey) || {};
      setRoleAssignments(savedAssignments);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 새 직급 추가
   */
  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      alert('직급 이름을 입력해주세요.');
      return;
    }
    
    if (roles.includes(newRoleName.trim())) {
      alert('이미 존재하는 직급입니다.');
      return;
    }
    
    const updatedRoles = [...roles, newRoleName.trim()];
    setRoles(updatedRoles);
    saveWalletData(rolesKey, updatedRoles);
    setNewRoleName('');
    setShowAddRoleModal(false);
  };

  /**
   * 직급 삭제
   */
  const handleDeleteRole = (roleToDelete) => {
    if (!confirm(`"${roleToDelete}" 직급을 삭제하시겠습니까? 이 직급이 배정된 모든 멤버의 직급이 제거됩니다.`)) {
      return;
    }
    
    // 직급 목록에서 제거
    const updatedRoles = roles.filter(role => role !== roleToDelete);
    setRoles(updatedRoles);
    saveWalletData(rolesKey, updatedRoles);
    
    // 해당 직급이 배정된 모든 멤버의 직급 제거
    const updatedAssignments = { ...roleAssignments };
    Object.keys(updatedAssignments).forEach(address => {
      if (updatedAssignments[address] === roleToDelete) {
        delete updatedAssignments[address];
      }
    });
    setRoleAssignments(updatedAssignments);
    saveWalletData(assignmentsKey, updatedAssignments);
  };

  /**
   * 멤버에게 직급 배정
   */
  const handleAssignRole = (ownerAddress, role) => {
    const updatedAssignments = {
      ...roleAssignments,
      [ownerAddress.toLowerCase()]: role
    };
    setRoleAssignments(updatedAssignments);
    saveWalletData(assignmentsKey, updatedAssignments);
  };

  /**
   * 멤버의 직급 제거
   */
  const handleRemoveRole = (ownerAddress) => {
    const updatedAssignments = { ...roleAssignments };
    delete updatedAssignments[ownerAddress.toLowerCase()];
    setRoleAssignments(updatedAssignments);
    saveWalletData(assignmentsKey, updatedAssignments);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">직급 관리</h1>
        <p className="text-gray-600">다중 서명 지갑의 멤버들에게 직급을 배정하고 관리합니다.</p>
      </div>

      {/* 직급 목록 카드 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">직급 목록</h2>
          <button
            onClick={() => setShowAddRoleModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + 직급 추가
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>등록된 직급이 없습니다. 직급을 추가해주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((role, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {role.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">{role}</span>
                </div>
                <button
                  onClick={() => handleDeleteRole(role)}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="직급 삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 멤버별 직급 배정 카드 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">멤버별 직급 배정</h2>

        {owners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>멤버가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {owners.map((owner, index) => {
              const assignedRole = roleAssignments[owner.toLowerCase()] || null;
              
              return (
                <div
                  key={owner}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">멤버 {index + 1}</p>
                      <p className="text-sm text-gray-600 font-mono truncate">{owner}</p>
                      {owner.toLowerCase() === currentWallet?.address?.toLowerCase() && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          나
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 현재 배정된 직급 표시 */}
                    {assignedRole ? (
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {assignedRole}
                        </span>
                        <button
                          onClick={() => handleRemoveRole(owner)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="직급 제거"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">직급 없음</span>
                    )}

                    {/* 직급 선택 드롭다운 */}
                    {roles.length > 0 && (
                      <select
                        value={assignedRole || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignRole(owner, e.target.value);
                          } else {
                            handleRemoveRole(owner);
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">직급 선택</option>
                        {roles.map((role, roleIndex) => (
                          <option key={roleIndex} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 직급 추가 모달 */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 직급 추가</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                직급 이름
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="예: 관리자, 멤버, 게스트"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddRole}
                disabled={!newRoleName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSigRolesPage;

