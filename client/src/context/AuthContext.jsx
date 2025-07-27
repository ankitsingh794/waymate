import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import api from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (accessToken) {
                try {
                    const { data } = await api.get('/users/profile');
                    setUser(data.data.user);
                } catch (error) {
                    console.error("Failed to fetch user profile with existing token.", error);
                    setAccessToken(null);
                    localStorage.removeItem('accessToken');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        fetchUserProfile();
    }, [accessToken]);
    
    const login = (userData, token) => {
        localStorage.setItem('accessToken', token);
        setAccessToken(token);
        setUser(userData);
        navigate('/dashboard');
    };

    const logout = () => {
        api.post('/auth/logout'); 
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
        navigate('/login');
    };
    
    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: !!user,
        loading,
        login,
        logout
    }), [user, accessToken, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};