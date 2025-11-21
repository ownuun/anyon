import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Operator = '+' | '-' | '×' | '÷' | null;

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
    setWaitingForOperand(false);
  }, []);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const toggleSign = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  }, [display]);

  const inputPercent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const calculate = useCallback((left: number, right: number, op: Operator): number => {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '×': return left * right;
      case '÷': return right !== 0 ? left / right : 0;
      default: return right;
    }
  }, []);

  const performOperation = useCallback((nextOperator: Operator) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, previousValue, operator, calculate]);

  const handleEquals = useCallback(() => {
    if (operator === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(previousValue, inputValue, operator);
    
    setDisplay(String(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, previousValue, operator, calculate]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDecimal();
      } else if (e.key === '+') {
        performOperation('+');
      } else if (e.key === '-') {
        performOperation('-');
      } else if (e.key === '*') {
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        handleEquals();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (e.key === 'Backspace') {
        clearEntry();
      } else if (e.key === '%') {
        inputPercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, handleEquals, clearAll, clearEntry, inputPercent]);

  const CalcButton = ({ 
    children, 
    onClick, 
    variant = 'secondary',
    className 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    variant?: 'default' | 'secondary' | 'outline';
    className?: string;
  }) => (
    <Button
      variant={variant}
      className={cn(
        'h-16 text-xl font-medium rounded-xl',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-xs p-4 bg-card">
        {/* Display */}
        <div className="mb-4 p-4 bg-muted rounded-xl text-right">
          <div className="text-sm text-muted-foreground h-6">
            {previousValue !== null && operator && `${previousValue} ${operator}`}
          </div>
          <div className="text-4xl font-light truncate">
            {display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <CalcButton onClick={clearAll} variant="outline">AC</CalcButton>
          <CalcButton onClick={toggleSign} variant="outline">±</CalcButton>
          <CalcButton onClick={inputPercent} variant="outline">%</CalcButton>
          <CalcButton onClick={() => performOperation('÷')} variant="default" className={operator === '÷' ? 'ring-2 ring-ring' : ''}>÷</CalcButton>

          {/* Row 2 */}
          <CalcButton onClick={() => inputDigit('7')}>7</CalcButton>
          <CalcButton onClick={() => inputDigit('8')}>8</CalcButton>
          <CalcButton onClick={() => inputDigit('9')}>9</CalcButton>
          <CalcButton onClick={() => performOperation('×')} variant="default" className={operator === '×' ? 'ring-2 ring-ring' : ''}>×</CalcButton>

          {/* Row 3 */}
          <CalcButton onClick={() => inputDigit('4')}>4</CalcButton>
          <CalcButton onClick={() => inputDigit('5')}>5</CalcButton>
          <CalcButton onClick={() => inputDigit('6')}>6</CalcButton>
          <CalcButton onClick={() => performOperation('-')} variant="default" className={operator === '-' ? 'ring-2 ring-ring' : ''}>−</CalcButton>

          {/* Row 4 */}
          <CalcButton onClick={() => inputDigit('1')}>1</CalcButton>
          <CalcButton onClick={() => inputDigit('2')}>2</CalcButton>
          <CalcButton onClick={() => inputDigit('3')}>3</CalcButton>
          <CalcButton onClick={() => performOperation('+')} variant="default" className={operator === '+' ? 'ring-2 ring-ring' : ''}>+</CalcButton>

          {/* Row 5 */}
          <CalcButton onClick={() => inputDigit('0')} className="col-span-2">0</CalcButton>
          <CalcButton onClick={inputDecimal}>.</CalcButton>
          <CalcButton onClick={handleEquals} variant="default">=</CalcButton>
        </div>
      </Card>
    </div>
  );
}
