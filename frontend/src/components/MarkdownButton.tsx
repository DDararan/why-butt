import React from 'react';

interface MarkdownButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

// 완전히 독립적인 마크다운 버튼 컴포넌트 (Editor와 의존성 분리)
const MarkdownButton: React.FC<MarkdownButtonProps> = ({ 
  children, 
  isActive = false, 
  onClick, 
  style,
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const baseStyle: React.CSSProperties = {
    padding: '6px 10px',
    backgroundColor: isActive ? '#ff9800' : 'white',
    color: isActive ? 'white' : 'black',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  return (
    <button
      onClick={handleClick}
      style={baseStyle}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};

export default React.memo(MarkdownButton);