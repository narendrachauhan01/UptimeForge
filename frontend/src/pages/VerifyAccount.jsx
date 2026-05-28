import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyAccount({ user }) {
    const navigate = useNavigate();
    useEffect(() => {
        if (user?.trialVerified) {
            navigate('/monitoring');
        } else {
            navigate('/pay?plan=verification');
        }
    }, [user, navigate]);
    return null;
}
