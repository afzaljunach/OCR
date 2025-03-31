import React from 'react'
import UploadSection from './UploadSection';
import DocumentDetails from './DocumentDetails';
import FeedbackForm from './FeedbackForm';

function DocInfoExtractor() {
    return (
        <div>
            <UploadSection />
            <DocumentDetails />

            <FeedbackForm />
        </div>
    )
}

export default DocInfoExtractor