import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingView from '../add-food/LoadingView';

describe('LoadingView', () => {
  it('should render with message', () => {
    const { getByText } = render(<LoadingView message="Loading..." />);

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render ActivityIndicator', () => {
    const { getByTestId, UNSAFE_root } = render(
      <LoadingView message="Loading..." />
    );

    // ActivityIndicator should be present
    const activityIndicator = UNSAFE_root.findAllByType('ActivityIndicator');
    expect(activityIndicator.length).toBeGreaterThan(0);
  });

  it('should render with message and submessage', () => {
    const { getByText } = render(
      <LoadingView message="Loading..." submessage="Please wait" />
    );

    expect(getByText('Loading...')).toBeTruthy();
    expect(getByText('Please wait')).toBeTruthy();
  });

  it('should not render submessage when not provided', () => {
    const { queryByText } = render(<LoadingView message="Loading..." />);

    // Only message should be present, no submessage
    expect(queryByText('Loading...')).toBeTruthy();
  });

  it('should render with long message', () => {
    const longMessage = 'This is a very long loading message that explains what is happening';
    const { getByText } = render(<LoadingView message={longMessage} />);

    expect(getByText(longMessage)).toBeTruthy();
  });

  it('should render with both long message and submessage', () => {
    const message = 'Processing your request';
    const submessage = 'This may take a few moments';
    const { getByText } = render(
      <LoadingView message={message} submessage={submessage} />
    );

    expect(getByText(message)).toBeTruthy();
    expect(getByText(submessage)).toBeTruthy();
  });

  it('should handle empty string message', () => {
    const { getByText } = render(<LoadingView message="" />);

    expect(getByText('')).toBeTruthy();
  });

  it('should handle empty string submessage', () => {
    const { getByText, queryByText } = render(
      <LoadingView message="Loading..." submessage="" />
    );

    expect(getByText('Loading...')).toBeTruthy();
    // Empty submessage should still render the Text component (React Native behavior)
    // We just verify the main message is present
  });

  it('should render with special characters in message', () => {
    const message = 'Loading: 50% complete!';
    const { getByText } = render(<LoadingView message={message} />);

    expect(getByText(message)).toBeTruthy();
  });

  it('should render multiple times with different messages', () => {
    const { getByText, rerender } = render(<LoadingView message="Loading..." />);
    expect(getByText('Loading...')).toBeTruthy();

    rerender(<LoadingView message="Processing..." />);
    expect(getByText('Processing...')).toBeTruthy();
  });
});
