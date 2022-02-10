import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import UrlContext from '../urlContext';

interface Props {
  to: string;
  className?: string;
  onClick?: (e: any) => null;
  title?: string;
  style?: {
    color?: string;
  };
  children: string;
}

const InternalLink = (props: Props) => {
  const { urlLink } = useContext(UrlContext);

  const { className, to, onClick, title, style, children } = props;
  return (
    <Link
      className={className}
      to={`${urlLink}${to}`}
      onClick={onClick}
      title={title}
      style={style}
    >
      {children}
    </Link>
  );
};

InternalLink.propTypes = {
  to: PropTypes.string.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
  title: PropTypes.string,
  style: PropTypes.shape({
    color: PropTypes.string,
  }),
  // eslint-disable-next-line react/forbid-prop-types -- TODO: resolve types here
  children: PropTypes.any.isRequired,
};

InternalLink.defaultProps = {
  className: undefined,
  onClick: undefined,
  title: undefined,
  style: {},
};

export default InternalLink;